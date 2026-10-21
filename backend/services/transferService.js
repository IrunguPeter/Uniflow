const Transaction = require('../models/Transaction');
const { AccountService, isValidProvider, getAccountLabel } = require('./accountService');

class TransferError extends Error {
    constructor(message, code, details = {}) {
        super(message);
        this.name = 'TransferError';
        this.code = code;
        this.details = details;
    }
}

function buildReference() {
    return `TRF${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 900 + 100)}`;
}

class TransferService {
    /**
     * Move money between two of the user's own accounts.
     *
     * @param {object} options
     * @param {string} options.userId
     * @param {string} options.from       source account (MPESA | NCBA | IM | CASH)
     * @param {string} options.to         destination account
     * @param {number} options.amount     positive amount in KES
     * @param {string} [options.description] optional note
     * @param {boolean} [options.force]   allow going past the tracked balance
     */
    static async create({ userId, from, to, amount, description, timestamp, transactionReference, force = false }) {
        if (!isValidProvider(from)) {
            throw new TransferError(`Invalid source account. Must be one of: MPESA, NCBA, IM, CASH`, 'INVALID_ACCOUNT');
        }
        if (!isValidProvider(to)) {
            throw new TransferError(`Invalid destination account. Must be one of: MPESA, NCBA, IM, CASH`, 'INVALID_ACCOUNT');
        }
        if (from === to) {
            throw new TransferError('Source and destination must be different accounts', 'SAME_ACCOUNT');
        }

        const value = Number(amount);
        if (!Number.isFinite(value) || value <= 0) {
            throw new TransferError('Amount must be a positive number', 'INVALID_AMOUNT');
        }

        const balances = await AccountService.getBalances(userId);
        const source = balances[from];

        if (!force && source.balance < value) {
            throw new TransferError(
                `Not enough tracked balance in ${getAccountLabel(from)}`,
                'INSUFFICIENT_FUNDS',
                { available: source.balance, requested: value, account: from }
            );
        }

        const payload = {
            userId,
            amount: value,
            description: (description && String(description).trim()) || `Transfer from ${getAccountLabel(from)} to ${getAccountLabel(to)}`,
            category: 'Transfer',
            type: 'transfer',
            provider: from,
            toProvider: to,
            timestamp: timestamp || new Date(),
        };

        // transactionReference is unique — retry on the (very unlikely) collision
        for (let attempt = 0; attempt < 3; attempt += 1) {
            try {
                return await Transaction.create({
                    ...payload,
                    transactionReference: transactionReference || buildReference(),
                });
            } catch (error) {
                const isUniqueViolation = error.name === 'SequelizeUniqueConstraintError';
                if (!isUniqueViolation || attempt === 2) throw error;
            }
        }
    }

    /** Most recent transfers between the user's accounts. */
    static async list(userId, limit = 50) {
        return Transaction.findAll({
            where: { userId, type: 'transfer' },
            order: [['timestamp', 'DESC']],
            limit,
        });
    }
}

module.exports = { TransferService, TransferError };
