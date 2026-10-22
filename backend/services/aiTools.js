const { TransactionService, TransactionServiceError, VALID_TYPES, VALID_CATEGORIES } = require('./transactionService');
const { TransferService, TransferError } = require('./transferService');
const { AccountService, isValidProvider, getAccountLabel } = require('./accountService');
const Transaction = require('../models/Transaction');
const PendingTransaction = require('../models/PendingTransaction');
const AiAction = require('../models/AiAction');

/**
 * The tools the AI is allowed to call.
 *
 * Every entry here is a real operation on the user's own ledger. The model
 * can only ever reach the data through these — there is no free-form SQL and
 * no raw access to the database.
 */
const TOOLS = [
    {
        type: 'function',
        function: {
            name: 'list_transactions',
            description: "Search the user's logged transactions. Use this first when the user refers to a transaction by name or description, so you can get its id before editing it.",
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Text to look for in the description, category or reference' },
                    type: { type: 'string', enum: VALID_TYPES },
                    category: { type: 'string', description: `One of: ${VALID_CATEGORIES.join(', ')}` },
                    provider: { type: 'string', enum: ['MPESA', 'NCBA', 'IM', 'CASH'] },
                    limit: { type: 'integer', description: 'How many to return (default 20, max 100)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'update_transaction',
            description: "Edit a logged transaction — change its amount, description, category, account or date. Only pass the fields you actually want to change.",
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'integer', description: 'Id of the transaction to edit' },
                    amount: { type: 'number', description: 'New amount in KES' },
                    description: { type: 'string' },
                    category: { type: 'string', description: `One of: ${VALID_CATEGORIES.join(', ')}` },
                    type: { type: 'string', enum: VALID_TYPES },
                    provider: { type: 'string', enum: ['MPESA', 'NCBA', 'IM', 'CASH'], description: 'The account the money is on' },
                    toProvider: { type: 'string', enum: ['MPESA', 'NCBA', 'IM', 'CASH'], description: 'Destination account — only for transfers' },
                    timestamp: { type: 'string', description: 'ISO date for the transaction' },
                    force: { type: 'boolean', description: 'Allow the edit even if it leaves the account overdrawn' },
                },
                required: ['id'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'categorize_pending_transaction',
            description: 'Finish one pending transaction (usually from a pasted M-Pesa SMS) by giving it a category. This logs it onto the ledger.',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'integer', description: 'Id of the pending transaction' },
                    category: { type: 'string', description: `One of: ${VALID_CATEGORIES.join(', ')}` },
                    description: { type: 'string', description: 'Optional better description' },
                },
                required: ['id', 'category'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'categorize_pending_transactions',
            description: 'Categorize every pending transaction at once, letting the rules and the AI work out the category for each. Use this when the user asks to tidy up or auto-categorize their pending transactions.',
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', description: 'How many pending transactions to handle (default 25)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'list_pending_transactions',
            description: "List the transactions still waiting to be categorized — usually pasted M-Pesa SMS that have not been logged yet.",
            parameters: {
                type: 'object',
                properties: {
                    limit: { type: 'integer', description: 'How many to return (default 25)' },
                },
                required: [],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'create_transaction',
            description: 'Log a new income or expense on the ledger.',
            parameters: {
                type: 'object',
                properties: {
                    type: { type: 'string', enum: ['income', 'expense'] },
                    amount: { type: 'number', description: 'Amount in KES' },
                    description: { type: 'string' },
                    category: { type: 'string', description: `One of: ${VALID_CATEGORIES.join(', ')}` },
                    provider: { type: 'string', enum: ['MPESA', 'NCBA', 'IM', 'CASH'] },
                    timestamp: { type: 'string', description: 'ISO date' },
                },
                required: ['type', 'amount', 'description'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'record_transfer',
            description: "Move money between two of the user's own accounts (M-Pesa, NCBA, I&M, Cash). This is not spending — the total balance stays the same.",
            parameters: {
                type: 'object',
                properties: {
                    from: { type: 'string', enum: ['MPESA', 'NCBA', 'IM', 'CASH'] },
                    to: { type: 'string', enum: ['MPESA', 'NCBA', 'IM', 'CASH'] },
                    amount: { type: 'number' },
                    description: { type: 'string' },
                    force: { type: 'boolean', description: 'Allow it even if the tracked balance is too low' },
                },
                required: ['from', 'to', 'amount'],
            },
        },
    },
    {
        type: 'function',
        function: {
            name: 'delete_transaction',
            description: 'Delete a transaction from the ledger. This is destructive — the user is always asked to confirm it first.',
            parameters: {
                type: 'object',
                properties: {
                    id: { type: 'integer', description: 'Id of the transaction to delete' },
                },
                required: ['id'],
            },
        },
    },
];

// Tools that change data in a way the user cannot undo — these are held back
// until the user explicitly confirms them.
const DESTRUCTIVE_TOOLS = new Set(['delete_transaction']);

function formatMoney(value) {
    return `KES ${Number(value || 0).toLocaleString()}`;
}

function describeTransaction(tx) {
    const label = tx.type === 'transfer'
        ? `${getAccountLabel(tx.provider)} → ${getAccountLabel(tx.toProvider)}`
        : getAccountLabel(tx.provider);
    return `#${tx.id} "${tx.description}" (${formatMoney(tx.amount)}, ${label}, ${tx.category})`;
}

/**
 * Perform a tool action. Returns a plain object; the caller decides whether
 * to hand it back to the model, the user, or both.
 */
async function runTool(name, args = {}, userId) {
    switch (name) {
        case 'list_transactions': {
            const rows = await TransactionService.search(userId, args);
            return {
                ok: true,
                count: rows.length,
                transactions: rows.map((tx) => ({
                    id: tx.id,
                    description: tx.description,
                    amount: tx.amount,
                    category: tx.category,
                    type: tx.type,
                    provider: tx.provider,
                    toProvider: tx.toProvider || null,
                    timestamp: tx.timestamp,
                })),
                summary: `Listed ${rows.length} transaction${rows.length === 1 ? '' : 's'}`,
            };
        }

        case 'list_pending_transactions': {
            const rows = await PendingTransaction.findAll({
                where: { userId, status: 'pending' },
                order: [['timestamp', 'DESC']],
                limit: Math.min(Number(args.limit) || 25, 100),
            });
            return {
                ok: true,
                count: rows.length,
                pending: rows.map((tx) => ({
                    id: tx.id,
                    amount: tx.amount,
                    type: tx.type,
                    counterparty: tx.counterparty,
                    suggestedDescription: tx.suggestedDescription,
                    fromProvider: tx.fromProvider,
                    toProvider: tx.toProvider,
                    timestamp: tx.timestamp,
                })),
                summary: `Listed ${rows.length} pending transaction${rows.length === 1 ? '' : 's'}`,
            };
        }

        case 'update_transaction': {
            const { transaction, changes } = await TransactionService.update(
                userId,
                Number(args.id),
                args,
                { force: Boolean(args.force) }
            );

            const changed = Object.keys(changes);
            return {
                ok: true,
                transaction: {
                    id: transaction.id,
                    description: transaction.description,
                    amount: transaction.amount,
                    category: transaction.category,
                    type: transaction.type,
                    provider: transaction.provider,
                    toProvider: transaction.toProvider || null,
                },
                changed,
                summary: `Updated transaction #${transaction.id} (${changed.join(', ') || 'no change'}) — now "${transaction.description}", ${formatMoney(transaction.amount)}, ${transaction.category}`,
            };
        }

        case 'categorize_pending_transaction': {
            const pending = await TransactionService.findPendingById(userId, Number(args.id));
            if (!pending) {
                return { ok: false, error: 'Pending transaction not found', summary: 'Pending transaction not found' };
            }

            const category = String(args.category || '').trim();
            if (!category) {
                return { ok: false, error: 'A category is required', summary: 'Missing category' };
            }

            if (pending.fromProvider && pending.toProvider) {
                // Cash withdrawal / deposit — a movement between own accounts
                const transfer = await TransferService.create({
                    userId,
                    from: pending.fromProvider,
                    to: pending.toProvider,
                    amount: pending.amount,
                    description: args.description || pending.suggestedDescription,
                    timestamp: pending.timestamp,
                    transactionReference: pending.transactionReference,
                    force: true,
                });
                await pending.update({ status: 'categorized' });
                return {
                    ok: true,
                    transaction: { id: transfer.id, type: 'transfer', provider: transfer.provider, toProvider: transfer.toProvider },
                    summary: `Recorded pending #${pending.id} as a transfer ${getAccountLabel(pending.fromProvider)} → ${getAccountLabel(pending.toProvider)} (${formatMoney(pending.amount)})`,
                };
            }

            const transaction = await Transaction.create({
                userId,
                amount: pending.amount,
                description: (args.description || pending.suggestedDescription || 'M-Pesa Transaction').trim(),
                category,
                type: pending.type,
                provider: 'MPESA',
                transactionReference: pending.transactionReference,
                timestamp: pending.timestamp,
            });
            await pending.update({ status: 'categorized' });

            return {
                ok: true,
                transaction: { id: transaction.id, category, amount: transaction.amount, description: transaction.description },
                summary: `Categorized pending #${pending.id} as ${category} (${formatMoney(pending.amount)})`,
            };
        }

        case 'categorize_pending_transactions': {
            const { categorizePending } = require('./categorizationService');
            const result = await categorizePending(userId, {
                limit: Math.min(Number(args.limit) || 25, 100),
            });
            return {
                ok: true,
                ...result,
                summary: `Categorized ${result.categorized} pending transaction${result.categorized === 1 ? '' : 's'}`,
            };
        }

        case 'create_transaction': {
            const type = args.type === 'income' ? 'income' : 'expense';
            const amount = Number(args.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
                return { ok: false, error: 'Amount must be a positive number', summary: 'Invalid amount' };
            }
            const provider = isValidProvider(args.provider) ? args.provider : 'MPESA';

            const transaction = await Transaction.create({
                userId,
                amount,
                description: String(args.description || 'Transaction').trim(),
                category: String(args.category || (type === 'income' ? 'Allowance & Gifts' : 'Other')).trim(),
                type,
                provider,
                timestamp: args.timestamp ? new Date(args.timestamp) : new Date(),
            });

            return {
                ok: true,
                transaction: { id: transaction.id, amount, category: transaction.category, type },
                summary: `Logged a ${type} of ${formatMoney(amount)} on ${getAccountLabel(provider)} — "${transaction.description}" (${transaction.category})`,
            };
        }

        case 'record_transfer': {
            const transfer = await TransferService.create({
                userId,
                from: args.from,
                to: args.to,
                amount: args.amount,
                description: args.description,
                timestamp: args.timestamp ? new Date(args.timestamp) : undefined,
                force: Boolean(args.force),
            });

            return {
                ok: true,
                transaction: { id: transfer.id, from: transfer.provider, to: transfer.toProvider, amount: transfer.amount },
                summary: `Transferred ${formatMoney(transfer.amount)} from ${getAccountLabel(transfer.provider)} to ${getAccountLabel(transfer.toProvider)}`,
            };
        }

        case 'delete_transaction': {
            const existing = await TransactionService.findById(userId, Number(args.id));
            if (!existing) {
                return { ok: false, error: 'Transaction not found', summary: 'Transaction not found' };
            }
            const label = describeTransaction(existing);
            await TransactionService.remove(userId, Number(args.id));
            return {
                ok: true,
                summary: `Deleted transaction ${label}`,
            };
        }

        default:
            return { ok: false, error: `Unknown tool "${name}"`, summary: `Unknown tool "${name}"` };
    }
}

/**
 * Request a tool.
 *
 * Destructive tools are not run here — they are parked as a pending action
 * and the user is asked to confirm. Everything else runs immediately and is
 * written to the audit trail.
 */
async function requestTool(name, args = {}, userId) {
    const needsConfirmation = DESTRUCTIVE_TOOLS.has(name);

    if (!needsConfirmation) {
        try {
            const result = await runTool(name, args, userId);
            await AiAction.create({
                userId,
                tool: name,
                parameters: args,
                summary: result.summary || name,
                requiresConfirmation: false,
                status: result.ok ? 'executed' : 'failed',
                result,
            });
            return result;
        } catch (error) {
            const message = error instanceof TransactionServiceError || error instanceof TransferError
                ? error.message
                : `Tool "${name}" failed`;
            await AiAction.create({
                userId,
                tool: name,
                parameters: args,
                summary: message,
                requiresConfirmation: false,
                status: 'failed',
                result: { ok: false, error: message, code: error.code || 'TOOL_ERROR' },
            });
            return { ok: false, error: message, code: error.code || 'TOOL_ERROR', summary: message };
        }
    }

    // Destructive — check the target exists before asking for confirmation
    const existing = await TransactionService.findById(userId, Number(args.id));
    if (!existing) {
        return { ok: false, error: 'Transaction not found', summary: 'Transaction not found' };
    }

    const summary = `Delete transaction ${describeTransaction(existing)}`;
    const action = await AiAction.create({
        userId,
        tool: name,
        parameters: args,
        summary,
        requiresConfirmation: true,
        status: 'pending',
    });

    return {
        ok: false,
        requiresConfirmation: true,
        action: {
            id: action.id,
            tool: name,
            summary,
            parameters: args,
        },
        error: 'Confirmation required',
        summary,
    };
}

/** Run a parked action once the user confirms it. */
async function confirmAction(userId, actionId) {
    const action = await AiAction.findOne({ where: { id: actionId, userId } });
    if (!action) {
        throw new TransactionServiceError('Action not found', 'NOT_FOUND');
    }
    if (action.status !== 'pending') {
        throw new TransactionServiceError(`Action was already ${action.status}`, 'ALREADY_RESOLVED');
    }

    try {
        const result = await runTool(action.tool, action.parameters || {}, userId);
        await action.update({
            status: result.ok ? 'executed' : 'failed',
            result,
            summary: result.summary || action.summary,
        });
        return { action, result };
    } catch (error) {
        const message = error.message || 'Action failed';
        await action.update({ status: 'failed', result: { ok: false, error: message } });
        throw error;
    }
}

/** Throw away a parked action. */
async function cancelAction(userId, actionId) {
    const action = await AiAction.findOne({ where: { id: actionId, userId } });
    if (!action) {
        throw new TransactionServiceError('Action not found', 'NOT_FOUND');
    }
    if (action.status !== 'pending') {
        throw new TransactionServiceError(`Action was already ${action.status}`, 'ALREADY_RESOLVED');
    }
    await action.update({ status: 'cancelled', result: { ok: false, cancelled: true } });
    return action;
}

module.exports = {
    TOOLS,
    DESTRUCTIVE_TOOLS,
    requestTool,
    runTool,
    confirmAction,
    cancelAction,
};
