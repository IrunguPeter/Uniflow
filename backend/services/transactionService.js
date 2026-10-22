const { Op } = require('sequelize');
const Transaction = require('../models/Transaction');
const PendingTransaction = require('../models/PendingTransaction');
const { computeBalances, isValidProvider, getAccountLabel } = require('./accountService');

const VALID_TYPES = ['income', 'expense', 'transfer'];
const VALID_CATEGORIES = [
    'Food & Dining', 'Groceries & Shopping', 'Transport', 'Utilities & Bills',
    'Airtime & Data', 'Rent & Housing', 'Education & Campus', 'Health & Pharmacy',
    'Entertainment & Leisure', 'Allowance & Gifts', 'Salary', 'HELB',
    'Remittance', 'Transfer', 'Savings', 'Other', 'Uncategorized',
];

// Only these fields may ever be changed on a transaction
const EDITABLE_FIELDS = ['amount', 'description', 'category', 'type', 'provider', 'toProvider', 'timestamp'];

// Control fields that callers may pass alongside the edits — they are not
// transaction fields, so they are quietly dropped rather than rejected.
const CONTROL_FIELDS = ['force', 'userId', 'id'];

class TransactionServiceError extends Error {
    constructor(message, code = 'INVALID_TRANSACTION', details = {}) {
        super(message);
        this.name = 'TransactionServiceError';
        this.code = code;
        this.details = details;
    }
}

class TransactionService {
    static async findById(userId, id) {
        return Transaction.findOne({ where: { id, userId } });
    }

    static async findPendingById(userId, id) {
        return PendingTransaction.findOne({ where: { id, userId } });
    }

    /**
     * Search a user's transactions so the AI (or a person) can find the row
     * they mean without knowing its id.
     */
    static async search(userId, { query, type, category, provider, limit = 20 } = {}) {
        const where = { userId };

        if (query) {
            const like = { [Op.like]: `%${query}%` };
            where[Op.or] = [
                { description: like },
                { category: like },
                { transactionReference: like },
            ];
        }
        if (type && VALID_TYPES.includes(type)) where.type = type;
        if (category) where.category = category;
        if (provider && isValidProvider(provider)) where.provider = provider;

        return Transaction.findAll({
            where,
            order: [['timestamp', 'DESC']],
            limit: Math.min(Number(limit) || 20, 100),
        });
    }

    /**
     * Validate and normalise a set of edits.
     *
     * Throws TransactionServiceError with a `code` the caller can surface
     * straight to the user or feed back to the model.
     */
    static validateChanges(changes = {}) {
        const updates = {};

        for (const key of Object.keys(changes)) {
            if (CONTROL_FIELDS.includes(key)) continue;
            if (!EDITABLE_FIELDS.includes(key)) {
                throw new TransactionServiceError(`Field "${key}" cannot be edited`, 'INVALID_FIELD', { field: key });
            }
        }

        if (changes.amount !== undefined) {
            const amount = Number(changes.amount);
            if (!Number.isFinite(amount) || amount <= 0) {
                throw new TransactionServiceError('Amount must be a positive number', 'INVALID_AMOUNT');
            }
            updates.amount = amount;
        }

        if (changes.description !== undefined) {
            const description = String(changes.description).trim();
            if (!description) {
                throw new TransactionServiceError('Description cannot be empty', 'INVALID_DESCRIPTION');
            }
            updates.description = description.slice(0, 255);
        }

        if (changes.category !== undefined) {
            const category = String(changes.category).trim();
            if (!category) {
                throw new TransactionServiceError('Category cannot be empty', 'INVALID_CATEGORY');
            }
            updates.category = category.slice(0, 60);
        }

        if (changes.type !== undefined) {
            if (!VALID_TYPES.includes(changes.type)) {
                throw new TransactionServiceError(`Type must be one of: ${VALID_TYPES.join(', ')}`, 'INVALID_TYPE');
            }
            updates.type = changes.type;
        }

        if (changes.provider !== undefined) {
            if (!isValidProvider(changes.provider)) {
                throw new TransactionServiceError('Invalid account. Must be one of: MPESA, NCBA, IM, CASH', 'INVALID_ACCOUNT');
            }
            updates.provider = changes.provider;
        }

        if (changes.toProvider !== undefined) {
            if (changes.toProvider === null || changes.toProvider === '') {
                updates.toProvider = null;
            } else if (!isValidProvider(changes.toProvider)) {
                throw new TransactionServiceError('Invalid destination account. Must be one of: MPESA, NCBA, IM, CASH', 'INVALID_ACCOUNT');
            } else {
                updates.toProvider = changes.toProvider;
            }
        }

        if (changes.timestamp !== undefined) {
            const timestamp = new Date(changes.timestamp);
            if (Number.isNaN(timestamp.getTime())) {
                throw new TransactionServiceError('Timestamp is not a valid date', 'INVALID_TIMESTAMP');
            }
            updates.timestamp = timestamp;
        }

        return updates;
    }

    /**
     * Edit an existing transaction.
     *
     * The resulting balances are projected before anything is written, so an
     * edit that would leave an account overdrawn is rejected instead of
     * silently corrupting the ledger.
     */
    static async update(userId, id, changes = {}, { force = false } = {}) {
        const existing = await this.findById(userId, id);
        if (!existing) {
            throw new TransactionServiceError('Transaction not found', 'NOT_FOUND');
        }

        const updates = this.validateChanges(changes);
        if (Object.keys(updates).length === 0) {
            throw new TransactionServiceError('Nothing to change', 'NO_CHANGES');
        }

        const before = existing.toJSON();
        const after = { ...before, ...updates };

        // A transfer needs two different accounts; anything else must not
        // carry a destination account.
        if (after.type === 'transfer') {
            if (!after.toProvider) {
                throw new TransactionServiceError('A transfer needs a destination account', 'MISSING_DESTINATION');
            }
            if (after.provider === after.toProvider) {
                throw new TransactionServiceError('Source and destination must be different accounts', 'SAME_ACCOUNT');
            }
        } else if (after.toProvider) {
            throw new TransactionServiceError('Only transfers can have a destination account', 'UNEXPECTED_DESTINATION');
        }

        // Project the balances this edit would produce. The edit is only
        // rejected if it is the thing that pushes an account into the red —
        // an edit that does not move money is never blocked by a shortfall
        // that was already there.
        if (!force) {
            const all = await Transaction.findAll({ where: { userId } });
            const current = computeBalances(all);
            const projected = computeBalances(
                all.map((tx) => (tx.id === existing.id ? after : tx.toJSON()))
            );

            for (const key of Object.keys(projected)) {
                const now = current[key].balance;
                const next = projected[key].balance;
                if (next < 0 && next < now) {
                    throw new TransactionServiceError(
                        `Not enough tracked balance in ${getAccountLabel(key)}`,
                        'INSUFFICIENT_FUNDS',
                        { available: now, requested: Math.abs(next), account: key }
                    );
                }
            }
        }

        const changed = {};
        for (const key of Object.keys(updates)) {
            if (String(before[key] ?? '') !== String(updates[key] ?? '')) {
                changed[key] = { from: before[key], to: updates[key] };
            }
        }

        existing.set(updates);
        await existing.save();

        return { transaction: existing, changes: changed };
    }

    static async remove(userId, id) {
        const existing = await this.findById(userId, id);
        if (!existing) {
            throw new TransactionServiceError('Transaction not found', 'NOT_FOUND');
        }
        await existing.destroy();
        return { transaction: existing };
    }
}

module.exports = {
    TransactionService,
    TransactionServiceError,
    VALID_TYPES,
    VALID_CATEGORIES,
    EDITABLE_FIELDS,
};
