const express = require('express');
const router = express.Router();
const BudgetService = require('../services/budgetService');
const AiFinancialAdvisor = require('../services/aiService');
const HelbPlannerService = require('../services/helbService');
const { parseMpesaSMS, parseBatchMpesaSMS } = require('../utils/mpesaParser');
const Transaction = require('../models/Transaction');
const PendingTransaction = require('../models/PendingTransaction');
const User = require('../models/User');
const RecurringExpense = require('../models/RecurringExpense');
const ChatMessage = require('../models/ChatMessage');
const BudgetPlan = require('../models/BudgetPlan');
const { AccountService, getAccountLabel } = require('../services/accountService');
const { TransferService, TransferError } = require('../services/transferService');
const { TransactionService, TransactionServiceError } = require('../services/transactionService');
const { categorizePending } = require('../services/categorizationService');
const { TOOLS, requestTool, confirmAction, cancelAction } = require('../services/aiTools');
const AiAction = require('../models/AiAction');

const VALID_TYPES = ['income', 'expense', 'transfer'];
const VALID_PROVIDERS = ['MPESA', 'NCBA', 'IM', 'CASH'];
const VALID_FREQUENCIES = ['weekly', 'monthly', 'semester'];
const VALID_RECURRING_TYPES = ['expense', 'income'];

// ── Budget Insight ──────────────────────────────────────────────────

router.get('/budget-insight', async (req, res) => {
    const { userId } = req.query;

    try {
        const user = await User.findOrCreateByUserId(userId || 'demo-user');
        const weeklyLimit = user.weeklyLimit;

        const budgetData = await BudgetService.checkWeeklySpend(userId || 'demo-user', weeklyLimit);
        const balances = await BudgetService.getBalance(userId || 'demo-user');

        const recentTransactions = await Transaction.findAll({
            where: { userId: userId || 'demo-user', type: 'expense' },
            order: [['timestamp', 'DESC']],
            limit: 5
        });

        const advice = await AiFinancialAdvisor.getSpendingAdvice({
            ...budgetData,
            recentTransactions
        });

        const leaks = await BudgetService.getSpendingLeaksAnalysis(userId || 'demo-user');

        res.json({
            ...budgetData,
            ...balances,
            savingsPercentage: user.savingsPercentage || 0,
            aiAdvice: advice,
            spendingLeaks: leaks
        });
    } catch (error) {
        console.error('Budget insight error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/spending-leaks', async (req, res) => {
    const { userId } = req.query;
    try {
        const leaks = await BudgetService.getSpendingLeaksAnalysis(userId || 'demo-user');
        res.json(leaks);
    } catch (error) {
        console.error('Spending leaks error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Transactions ────────────────────────────────────────────────────

router.get('/transactions', async (req, res) => {
    const { userId } = req.query;

    try {
        const transactions = await Transaction.findAll({
            where: { userId: userId || 'demo-user' },
            order: [['timestamp', 'DESC']],
            limit: 50
        });
        res.json(transactions);
    } catch (error) {
        console.error('Fetch transactions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/transactions', async (req, res) => {
    const { userId, amount, description, category, type, provider, toProvider, timestamp } = req.body;
    const uid = userId || 'demo-user';

    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return res.status(400).json({ error: 'Description is required' });
    }
    if (type && !VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}` });
    }
    if (provider && !VALID_PROVIDERS.includes(provider)) {
        return res.status(400).json({ error: `Invalid provider. Must be one of: ${VALID_PROVIDERS.join(', ')}` });
    }

    try {
        const txType = type || 'expense';

        // Transfers between the user's own accounts need a destination account
        if (txType === 'transfer') {
            if (!toProvider) {
                return res.status(400).json({ error: 'A destination account is required for transfers' });
            }
            const transfer = await TransferService.create({
                userId: uid,
                from: provider,
                to: toProvider,
                amount,
                description: description.trim(),
                timestamp
            });
            return res.status(201).json({ transaction: transfer, transfer });
        }

        const transaction = await Transaction.create({
            userId: uid,
            amount,
            description: description.trim(),
            category: category || 'Uncategorized',
            type: txType,
            provider: provider || 'CASH',
            timestamp: timestamp || new Date()
        });

        let savingsTx = null;
        if (txType === 'income') {
            const user = await User.findOrCreateByUserId(uid);
            if (user.savingsPercentage > 0) {
                const savingsAmount = Math.round(amount * (user.savingsPercentage / 100));
                if (savingsAmount > 0) {
                    savingsTx = await Transaction.create({
                        userId: uid,
                        amount: savingsAmount,
                        description: `Auto-saved from ${description.trim()}`,
                        category: 'Savings',
                        type: 'expense',
                        provider: provider || 'CASH',
                        timestamp: timestamp || new Date()
                    });
                }
            }
        }

        res.status(201).json({ transaction, savingsTx });
    } catch (error) {
        console.error('Add transaction error:', error);
        res.status(500).json({ error: 'Failed to save transaction' });
    }
});

router.delete('/transactions/:id', async (req, res) => {
    const { id } = req.params;
    const uid = req.query.userId || req.body?.userId || 'demo-user';

    try {
        const deleted = await Transaction.destroy({ where: { id, userId: uid } });
        if (!deleted) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete transaction error:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

// ── Edit a transaction ─────────────────────────────────────────────
// Registered for both PATCH and PUT so proxies that strip one verb still work.

const updateTransactionHandler = async (req, res) => {
    const { id } = req.params;
    const uid = req.body?.userId || req.query.userId || 'demo-user';

    try {
        const { transaction, changes } = await TransactionService.update(uid, id, req.body, {
            force: Boolean(req.body?.force),
        });
        res.json({ transaction, changes });
    } catch (error) {
        if (error instanceof TransactionServiceError) {
            const status = error.code === 'NOT_FOUND' ? 404
                : error.code === 'INSUFFICIENT_FUNDS' ? 409 : 400;
            return res.status(status).json({ error: error.message, code: error.code, ...error.details });
        }
        console.error('Update transaction error:', error);
        res.status(500).json({ error: 'Failed to update transaction' });
    }
};

router.patch('/transactions/:id', updateTransactionHandler);
router.put('/transactions/:id', updateTransactionHandler);

// ── Accounts ───────────────────────────────────────────────────────

router.get('/accounts', async (req, res) => {
    const { userId } = req.query;
    const uid = userId || 'demo-user';

    try {
        const accounts = await AccountService.getSummaries(uid);
        const balances = await BudgetService.getBalance(uid);

        res.json({
            accounts,
            totals: {
                balance: balances.balance,
                income: balances.income,
                expenses: balances.expenses,
                mpesa: balances.mpesaBalance,
                bank: balances.bankBalance,
                cash: balances.cashBalance,
            },
        });
    } catch (error) {
        console.error('Fetch accounts error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ── Transfers (between the user's own accounts) ────────────────────

router.get('/transfers', async (req, res) => {
    const { userId, limit } = req.query;
    const uid = userId || 'demo-user';

    try {
        const transfers = await TransferService.list(uid, Math.min(Number(limit) || 50, 200));
        res.json(transfers);
    } catch (error) {
        console.error('Fetch transfers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/transfers', async (req, res) => {
    const { userId, from, to, amount, description, timestamp, force } = req.body;
    const uid = userId || 'demo-user';

    try {
        const transfer = await TransferService.create({
            userId: uid,
            from,
            to,
            amount,
            description,
            timestamp,
            force: Boolean(force),
        });

        res.status(201).json({
            transfer,
            message: `Transferred KES ${Number(amount).toLocaleString()} from ${getAccountLabel(from)} to ${getAccountLabel(to)}`,
        });
    } catch (error) {
        if (error instanceof TransferError) {
            const status = error.code === 'INSUFFICIENT_FUNDS' ? 409 : 400;
            return res.status(status).json({ error: error.message, code: error.code, ...error.details });
        }
        console.error('Create transfer error:', error);
        res.status(500).json({ error: 'Failed to record transfer' });
    }
});

// ── M-Pesa SMS Parsing (Fast Local + AI-Ready) ─────────────────────────

router.post('/parse-sms', async (req, res) => {
    const { smsText, userId } = req.body;
    const uid = userId || 'demo-user';

    if (!smsText || typeof smsText !== 'string' || smsText.trim().length === 0) {
        return res.status(400).json({ error: 'SMS text is required' });
    }

    try {
        // Fast, deterministic local parser for M-Pesa
        const parsed = parseMpesaSMS(smsText.trim());

        if (!parsed) {
            // Try AI fallback if configured
            try {
                const aiParsed = await AiFinancialAdvisor.parseMpesaSMS(smsText.trim());
                if (aiParsed && aiParsed.isMpesa) {
                    const pendingTx = await PendingTransaction.create({
                        userId: uid,
                        rawSms: smsText.trim(),
                        amount: aiParsed.amount,
                        type: aiParsed.type,
                        counterparty: aiParsed.counterparty,
                        transactionReference: aiParsed.reference,
                        suggestedDescription: aiParsed.description || 'M-Pesa Transaction',
                        status: 'pending',
                        timestamp: aiParsed.timestamp ? new Date(aiParsed.timestamp) : new Date()
                    });
                    return res.status(201).json({ pending: true, transaction: pendingTx });
                }
            } catch {
                // ignore AI failure
            }
            return res.status(400).json({ error: 'Could not extract M-Pesa details. Please check the SMS format.' });
        }

        // Save as pending transaction with pre-categorized details
        const pendingTx = await PendingTransaction.create({
            userId: uid,
            rawSms: smsText.trim(),
            amount: parsed.amount,
            type: parsed.type,
            counterparty: parsed.counterparty,
            transactionReference: parsed.ref,
            suggestedDescription: parsed.description,
            fromProvider: parsed.fromProvider || null,
            toProvider: parsed.toProvider || null,
            status: 'pending',
            timestamp: parsed.timestamp || new Date()
        });

        res.status(201).json({
            pending: true,
            transaction: pendingTx,
            parsedDetails: {
                balance: parsed.balance,
                cost: parsed.cost,
                suggestedCategory: parsed.category,
                fromProvider: parsed.fromProvider || null,
                toProvider: parsed.toProvider || null
            },
            message: 'M-Pesa SMS parsed successfully'
        });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'This transaction has already been logged or parsed.' });
        }
        console.error('SMS Parse error:', error);
        res.status(500).json({ error: 'Failed to process SMS' });
    }
});

// ── Batch Parse M-Pesa SMS (Paste multiple SMS at once) ───────────────

router.post('/parse-batch-sms', async (req, res) => {
    const { batchText, autoConfirm, userId } = req.body;
    const uid = userId || 'demo-user';

    if (!batchText || typeof batchText !== 'string' || batchText.trim().length === 0) {
        return res.status(400).json({ error: 'Batch SMS text is required' });
    }

    try {
        const parsedList = parseBatchMpesaSMS(batchText.trim());

        if (parsedList.length === 0) {
            return res.status(400).json({ error: 'No valid M-Pesa messages detected in input.' });
        }

        const results = {
            totalParsed: parsedList.length,
            logged: 0,
            pending: 0,
            skipped: 0,
            items: []
        };

        for (const item of parsedList) {
            try {
                if (autoConfirm) {
                    // Cash withdrawals / deposits move money between M-Pesa and
                    // Cash — record them as transfers, not spending.
                    if (item.type === 'transfer' && item.fromProvider && item.toProvider) {
                        const tx = await TransferService.create({
                            userId: uid,
                            from: item.fromProvider,
                            to: item.toProvider,
                            amount: item.amount,
                            description: item.description,
                            timestamp: item.timestamp,
                            transactionReference: item.ref,
                            force: true
                        });
                        results.logged++;
                        results.items.push(tx);
                        continue;
                    }

                    // Create transaction directly
                    const tx = await Transaction.create({
                        userId: uid,
                        amount: item.amount,
                        description: item.description,
                        category: item.category,
                        type: item.type,
                        provider: 'MPESA',
                        transactionReference: item.ref,
                        timestamp: item.timestamp
                    });
                    results.logged++;
                    results.items.push(tx);
                } else {
                    // Save as pending transaction
                    const pTx = await PendingTransaction.create({
                        userId: uid,
                        rawSms: item.rawSms,
                        amount: item.amount,
                        type: item.type,
                        counterparty: item.counterparty,
                        transactionReference: item.ref,
                        suggestedDescription: item.description,
                        fromProvider: item.fromProvider || null,
                        toProvider: item.toProvider || null,
                        status: 'pending',
                        timestamp: item.timestamp
                    });
                    results.pending++;
                    results.items.push(pTx);
                }
            } catch (err) {
                if (err.name === 'SequelizeUniqueConstraintError') {
                    results.skipped++;
                } else {
                    console.error('Batch item error:', err);
                }
            }
        }

        res.json(results);
    } catch (error) {
        console.error('Batch parse error:', error);
        res.status(500).json({ error: 'Failed to process batch SMS' });
    }
});

// ── Pending Transactions (for categorization) ────────────────────────

router.get('/pending-transactions', async (req, res) => {
    const { userId } = req.query;

    try {
        const pending = await PendingTransaction.findAll({
            where: { userId: userId || 'demo-user', status: 'pending' },
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        res.json(pending);
    } catch (error) {
        console.error('Fetch pending error:', error);
        res.status(500).json({ error: 'Failed to fetch pending transactions' });
    }
});

router.post('/pending-transactions/:id/categorize', async (req, res) => {
    const { id } = req.params;
    const { category, description, asTransfer } = req.body;

    if (!category && !asTransfer) {
        return res.status(400).json({ error: 'Category is required' });
    }

    try {
        const pending = await PendingTransaction.findByPk(id);
        if (!pending) {
            return res.status(404).json({ error: 'Pending transaction not found' });
        }

        // Record as a transfer between the user's own accounts (e.g. M-Pesa -> Cash)
        if (asTransfer && pending.fromProvider && pending.toProvider) {
            const transfer = await TransferService.create({
                userId: pending.userId,
                from: pending.fromProvider,
                to: pending.toProvider,
                amount: pending.amount,
                description: description || pending.suggestedDescription,
                timestamp: pending.timestamp,
                transactionReference: pending.transactionReference,
                force: true
            });

            await pending.update({ status: 'categorized' });

            return res.json({ transaction: transfer, transfer, pending });
        }

        // Create the actual transaction
        const transaction = await Transaction.create({
            userId: pending.userId,
            amount: pending.amount,
            description: description || pending.suggestedDescription || 'M-Pesa Transaction',
            category,
            type: pending.type,
            provider: 'MPESA',
            transactionReference: pending.transactionReference,
            timestamp: pending.timestamp
        });

        // Update pending status
        await pending.update({ status: 'categorized' });

        res.json({ transaction, pending });
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ error: 'Transaction already exists' });
        }
        if (error instanceof TransferError) {
            return res.status(400).json({ error: error.message, code: error.code });
        }
        console.error('Categorize error:', error);
        res.status(500).json({ error: 'Failed to categorize transaction' });
    }
});

router.post('/pending-transactions/:id/ignore', async (req, res) => {
    const { id } = req.params;
    const uid = req.body?.userId || req.query.userId || 'demo-user';

    try {
        const pending = await PendingTransaction.findOne({ where: { id, userId: uid } });
        if (!pending) {
            return res.status(404).json({ error: 'Pending transaction not found' });
        }

        await pending.update({ status: 'ignored' });
        res.json({ success: true });
    } catch (error) {
        console.error('Ignore error:', error);
        res.status(500).json({ error: 'Failed to ignore transaction' });
    }
});

// ── Auto-categorize pending transactions ───────────────────────────
// Works out a category for every pending transaction (keyword rules first,
// AI for the ambiguous ones) and logs them onto the ledger.

router.post('/pending-transactions/auto-categorize', async (req, res) => {
    const { userId, limit } = req.body || {};
    const uid = userId || 'demo-user';

    try {
        const result = await categorizePending(uid, { limit: limit || 25 });
        res.json({
            ...result,
            message: result.categorized === 0
                ? 'No pending transactions to categorize'
                : `Categorized ${result.categorized} transaction${result.categorized === 1 ? '' : 's'}`,
        });
    } catch (error) {
        console.error('Auto-categorize error:', error);
        res.status(500).json({ error: 'Failed to auto-categorize transactions' });
    }
});

// ── AI action audit trail ───────────────────────────────────────────

router.get('/ai/actions', async (req, res) => {
    const { userId, limit } = req.query;
    const uid = userId || 'demo-user';

    try {
        const actions = await AiAction.findAll({
            where: { userId: uid },
            order: [['createdAt', 'DESC']],
            limit: Math.min(Number(limit) || 50, 200),
        });
        res.json(actions);
    } catch (error) {
        console.error('Fetch AI actions error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Run a destructive action the AI asked for, once the user has approved it
router.post('/ai/actions/:id/confirm', async (req, res) => {
    const { id } = req.params;
    const uid = req.body?.userId || req.query.userId || 'demo-user';

    try {
        const { action, result } = await confirmAction(uid, id);
        res.json({ action, result, message: result.summary });
    } catch (error) {
        if (error instanceof TransactionServiceError) {
            const status = error.code === 'NOT_FOUND' ? 404 : 400;
            return res.status(status).json({ error: error.message, code: error.code });
        }
        console.error('Confirm AI action error:', error);
        res.status(500).json({ error: 'Failed to run the action' });
    }
});

router.post('/ai/actions/:id/cancel', async (req, res) => {
    const { id } = req.params;
    const uid = req.body?.userId || req.query.userId || 'demo-user';

    try {
        const action = await cancelAction(uid, id);
        res.json({ action, message: 'Action cancelled' });
    } catch (error) {
        if (error instanceof TransactionServiceError) {
            const status = error.code === 'NOT_FOUND' ? 404 : 400;
            return res.status(status).json({ error: error.message, code: error.code });
        }
        console.error('Cancel AI action error:', error);
        res.status(500).json({ error: 'Failed to cancel the action' });
    }
});

// ── Auto-Sync SMS ───────────────────────────────────────────────────

router.post('/sync-sms', async (req, res) => {
    const { messages, userId } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ error: 'Messages array is required' });
    }

    const uid = userId || 'demo-user';
    const results = { synced: 0, pending: 0, skipped: 0, failed: 0, transactions: [] };

    for (const msg of messages) {
        try {
            const smsText = msg.body || msg.text || '';
            const timestamp = msg.timestamp ? new Date(msg.timestamp) : new Date();

            // Deterministic local parser first, AI fallback
            let parsed = parseMpesaSMS(smsText);
            if (!parsed) {
                const aiParsed = await AiFinancialAdvisor.parseMpesaSMS(smsText);
                if (!aiParsed || !aiParsed.isMpesa) {
                    results.skipped++;
                    continue;
                }
                parsed = {
                    amount: aiParsed.amount,
                    type: aiParsed.type,
                    counterparty: aiParsed.counterparty,
                    ref: aiParsed.reference,
                    description: aiParsed.description || 'M-Pesa Transaction',
                    timestamp: aiParsed.timestamp ? new Date(aiParsed.timestamp) : timestamp,
                };
            }

            // Create pending transaction for user to categorize
            const pendingTx = await PendingTransaction.create({
                userId: uid,
                rawSms: smsText,
                amount: parsed.amount,
                type: parsed.type,
                counterparty: parsed.counterparty,
                transactionReference: parsed.ref,
                suggestedDescription: parsed.description,
                fromProvider: parsed.fromProvider || null,
                toProvider: parsed.toProvider || null,
                status: 'pending',
                timestamp: parsed.timestamp || timestamp
            });

            results.pending++;
            results.transactions.push(pendingTx);
        } catch (error) {
            if (error.name === 'SequelizeUniqueConstraintError') {
                results.skipped++;
            } else {
                console.error('Sync SMS error:', error);
                results.failed++;
            }
        }
    }

    if (results.pending > 0) {
        lastSyncTime = new Date();
        totalSynced += results.pending;
    }

    res.json(results);
});

// ── Device Registration (for Android app) ───────────────────────────

const registeredDevices = new Map();

router.post('/device/register', async (req, res) => {
    const { deviceId, userId, fcmToken } = req.body;

    if (!deviceId) {
        return res.status(400).json({ error: 'Device ID is required' });
    }

    registeredDevices.set(deviceId, {
        userId: userId || 'demo-user',
        fcmToken,
        registeredAt: new Date(),
        lastSync: null
    });

    res.json({ success: true, deviceId });
});

router.post('/device/sync-status', async (req, res) => {
    const { deviceId } = req.body;

    if (!deviceId || !registeredDevices.has(deviceId)) {
        return res.status(404).json({ error: 'Device not found' });
    }

    const device = registeredDevices.get(deviceId);
    device.lastSync = new Date();

    res.json({ success: true, lastSync: device.lastSync });
});

// ── Sync Stats (for Dashboard) ─────────────────────────────────────

let lastSyncTime = null;
let totalSynced = 0;

router.get('/sync-stats', async (req, res) => {
    try {
        const mpesaTxCount = await Transaction.count({
            where: { userId: req.query.userId || 'demo-user', provider: 'MPESA' }
        });

        res.json({
            lastSync: lastSyncTime,
            totalSynced,
            mpesaTransactions: mpesaTxCount,
            isActive: lastSyncTime && (Date.now() - new Date(lastSyncTime).getTime()) < 5 * 60 * 1000
        });
    } catch (error) {
        console.error('Sync stats error:', error);
        res.status(500).json({ error: 'Failed to get sync stats' });
    }
});

// ── HELB Planner ────────────────────────────────────────────────────

router.post('/helb-calculate', (req, res) => {
    const { totalLoan, weeksPerSemester, fixedCosts } = req.body;

    if (!totalLoan || typeof totalLoan !== 'number' || totalLoan <= 0) {
        return res.status(400).json({ error: 'Total loan must be a positive number' });
    }
    if (!weeksPerSemester || typeof weeksPerSemester !== 'number' || weeksPerSemester <= 0) {
        return res.status(400).json({ error: 'Weeks per semester must be a positive number' });
    }

    const costs = fixedCosts && typeof fixedCosts === 'object' ? fixedCosts : {};
    const result = HelbPlannerService.calculateAllocation(totalLoan, weeksPerSemester, costs);
    res.json(result);
});

// ── Recurring Entries ───────────────────────────────────────────────

router.get('/recurring-expenses', async (req, res) => {
    const { userId, type } = req.query;

    try {
        const where = { userId: userId || 'demo-user' };
        if (type && VALID_RECURRING_TYPES.includes(type)) {
            where.type = type;
        }
        const items = await RecurringExpense.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
        res.json(items);
    } catch (error) {
        console.error('Fetch recurring entries error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/recurring-expenses', async (req, res) => {
    const { userId, name, amount, frequency, category, type } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({ error: 'Name is required' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
    }
    if (frequency && !VALID_FREQUENCIES.includes(frequency)) {
        return res.status(400).json({ error: `Invalid frequency. Must be one of: ${VALID_FREQUENCIES.join(', ')}` });
    }
    if (type && !VALID_RECURRING_TYPES.includes(type)) {
        return res.status(400).json({ error: `Invalid type. Must be one of: ${VALID_RECURRING_TYPES.join(', ')}` });
    }

    try {
        const item = await RecurringExpense.create({
            userId: userId || 'demo-user',
            name: name.trim(),
            amount,
            frequency: frequency || 'monthly',
            category: category || 'Other',
            type: type || 'expense'
        });
        res.status(201).json(item);
    } catch (error) {
        console.error('Add recurring entry error:', error);
        res.status(500).json({ error: 'Failed to save recurring entry' });
    }
});

router.delete('/recurring-expenses/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const deleted = await RecurringExpense.destroy({ where: { id } });
        if (!deleted) {
            return res.status(404).json({ error: 'Recurring entry not found' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete recurring entry error:', error);
        res.status(500).json({ error: 'Failed to delete recurring entry' });
    }
});

// ── Savings Config ──────────────────────────────────────────────────

router.get('/savings-config', async (req, res) => {
    const { userId } = req.query;

    try {
        const user = await User.findOrCreateByUserId(userId || 'demo-user');
        res.json({ savingsPercentage: user.savingsPercentage || 0 });
    } catch (error) {
        console.error('Fetch savings config error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.put('/savings-config', async (req, res) => {
    const { userId, savingsPercentage } = req.body;

    if (savingsPercentage === undefined || typeof savingsPercentage !== 'number' || savingsPercentage < 0 || savingsPercentage > 100) {
        return res.status(400).json({ error: 'Savings percentage must be between 0 and 100' });
    }

    try {
        const user = await User.findOrCreateByUserId(userId || 'demo-user');
        user.savingsPercentage = savingsPercentage;
        await user.save();
        res.json({ savingsPercentage: user.savingsPercentage });
    } catch (error) {
        console.error('Update savings config error:', error);
        res.status(500).json({ error: 'Failed to update savings config' });
    }
});

// ── Budget Plan ─────────────────────────────────────────────────────

router.get('/budget-plan', async (req, res) => {
    const { userId } = req.query;

    try {
        const plan = await BudgetPlan.findOne({ where: { userId: userId || 'demo-user' } });
        if (!plan) {
            return res.json(null);
        }
        const summary = await BudgetService.getBudgetSummary(userId || 'demo-user', plan);
        res.json({ plan, summary });
    } catch (error) {
        console.error('Fetch budget plan error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/budget-plan', async (req, res) => {
    const { userId, totalBudget, period, essentialsPct, miscPct, categories } = req.body;

    if (!totalBudget || typeof totalBudget !== 'number' || totalBudget <= 0) {
        return res.status(400).json({ error: 'Total budget must be a positive number' });
    }

    try {
        const uid = userId || 'demo-user';
        const existing = await BudgetPlan.findOne({ where: { userId: uid } });

        const planData = {
            userId: uid,
            totalBudget,
            period: period || 'monthly',
            essentialsPct: essentialsPct !== undefined ? essentialsPct : 70,
            miscPct: miscPct !== undefined ? miscPct : 30,
            categories: categories || []
        };

        let plan;
        if (existing) {
            await existing.update(planData);
            plan = existing;
        } else {
            plan = await BudgetPlan.create(planData);
        }

        res.status(201).json(plan);
    } catch (error) {
        console.error('Save budget plan error:', error);
        res.status(500).json({ error: 'Failed to save budget plan' });
    }
});

router.delete('/budget-plan', async (req, res) => {
    const { userId } = req.query;

    try {
        await BudgetPlan.destroy({ where: { userId: userId || 'demo-user' } });
        res.json({ success: true });
    } catch (error) {
        console.error('Delete budget plan error:', error);
        res.status(500).json({ error: 'Failed to delete budget plan' });
    }
});

// ── AI Chat ─────────────────────────────────────────────────────────

router.get('/chat/history', async (req, res) => {
    const { userId } = req.query;

    try {
        const messages = await ChatMessage.findAll({
            where: { userId: userId || 'demo-user' },
            order: [['createdAt', 'ASC']],
            limit: 50
        });
        res.json(messages);
    } catch (error) {
        console.error('Fetch chat history error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.post('/chat', async (req, res) => {
    const { userId, message } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ error: 'Message is required' });
    }

    const uid = userId || 'demo-user';

    try {
        await ChatMessage.create({ userId: uid, role: 'user', content: message.trim() });

        const user = await User.findOrCreateByUserId(uid);
        const budgetData = await BudgetService.checkWeeklySpend(uid, user.weeklyLimit);
        const balances = await BudgetService.getBalance(uid);

        const recentTransactions = await Transaction.findAll({
            where: { userId: uid },
            order: [['timestamp', 'DESC']],
            limit: 10
        });

        const categoryTotals = {};
        recentTransactions.forEach(tx => {
            if (tx.type === 'expense') {
                categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
            }
        });
        const topCategories = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, total]) => ({ name, total }));

        const chatHistory = await ChatMessage.findAll({
            where: { userId: uid },
            order: [['createdAt', 'ASC']],
            limit: 20
        });

        const financialContext = {
            ...budgetData,
            ...balances,
            recentTransactions: recentTransactions.map(tx => ({
                id: tx.id,
                description: tx.description,
                amount: tx.amount,
                category: tx.category,
                type: tx.type,
                provider: tx.provider,
                toProvider: tx.toProvider || undefined
            })),
            topCategories
        };

        // The AI gets tools so it can actually change the ledger, not just
        // talk about it. Destructive actions come back as pending actions
        // that the user has to approve first.
        const { reply, activity, pendingActions } = await AiFinancialAdvisor.chatWithTools(
            message.trim(),
            financialContext,
            chatHistory.map(m => ({ role: m.role, content: m.content })),
            {
                tools: TOOLS,
                requestTool: (name, args) => requestTool(name, args, uid),
                userId: uid,
            }
        );

        await ChatMessage.create({
            userId: uid,
            role: 'assistant',
            content: reply,
            metadata: { activity, pendingActions },
        });

        res.json({
            reply,
            activity,
            pendingActions,
            userMessage: { role: 'user', content: message.trim() },
            assistantMessage: { role: 'assistant', content: reply }
        });
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: 'Failed to get AI response' });
    }
});

router.delete('/chat/history', async (req, res) => {
    const { userId } = req.query;

    try {
        await ChatMessage.destroy({ where: { userId: userId || 'demo-user' } });
        res.json({ success: true });
    } catch (error) {
        console.error('Clear chat history error:', error);
        res.status(500).json({ error: 'Failed to clear chat history' });
    }
});

// ── Charts Data ─────────────────────────────────────────────────────

router.get('/charts', async (req, res) => {
    const { userId } = req.query;

    try {
        const data = await BudgetService.getChartData(userId || 'demo-user');
        res.json(data);
    } catch (error) {
        console.error('Charts data error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
