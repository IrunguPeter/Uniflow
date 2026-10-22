const Transaction = require('../models/Transaction');

/**
 * The accounts a student can hold money in.
 * Bank is modelled as two providers (NCBA / I&M) so money can move between
 * them, while the Dashboard still reports them together as "Bank".
 */
const ACCOUNTS = [
    { provider: 'MPESA', label: 'M-Pesa', group: 'mpesa', icon: '📱', tint: 'emerald' },
    { provider: 'NCBA', label: 'NCBA', group: 'bank', icon: '🏦', tint: 'blue' },
    { provider: 'IM', label: 'I&M', group: 'bank', icon: '🏦', tint: 'violet' },
    { provider: 'CASH', label: 'Cash', group: 'cash', icon: '💵', tint: 'gray' },
];

const ACCOUNT_KEYS = ACCOUNTS.map((account) => account.provider);

function isValidProvider(provider) {
    return ACCOUNT_KEYS.includes(provider);
}

function getAccount(provider) {
    return ACCOUNTS.find((account) => account.provider === provider) || null;
}

function getAccountLabel(provider) {
    const account = getAccount(provider);
    return account ? account.label : provider;
}

/**
 * Turn a list of transaction rows into per-account balances.
 *
 * Income adds to an account, expenses take away from it, and a transfer
 * simply moves money from the source account to the destination account —
 * it never creates or destroys money, so it is excluded from the
 * income/expense totals used for budgeting.
 *
 * Kept as a pure function so callers can project a balance for a set of
 * rows that do not exist yet (e.g. checking an edit before applying it).
 */
function computeBalances(transactions) {
    const balances = {};
    for (const account of ACCOUNTS) {
        balances[account.provider] = {
            ...account,
            balance: 0,
            income: 0,
            expenses: 0,
            transferredIn: 0,
            transferredOut: 0,
        };
    }

    for (const tx of transactions) {
        const from = balances[tx.provider];
        const to = balances[tx.toProvider];

        if (tx.type === 'income') {
            if (from) {
                from.balance += tx.amount;
                from.income += tx.amount;
            }
        } else if (tx.type === 'expense') {
            if (from) {
                from.balance -= tx.amount;
                from.expenses += tx.amount;
            }
        } else if (tx.type === 'transfer') {
            if (from) {
                from.balance -= tx.amount;
                from.transferredOut += tx.amount;
            }
            if (to) {
                to.balance += tx.amount;
                to.transferredIn += tx.amount;
            }
        }
    }

    return balances;
}

class AccountService {
    /** Per-account running balance for a user. */
    static async getBalances(userId) {
        const transactions = await Transaction.findAll({ where: { userId } });
        return computeBalances(transactions);
    }


    /** Account list with balances — used by the transfer form and the API. */
    static async getSummaries(userId) {
        const balances = await this.getBalances(userId);
        return ACCOUNTS.map((account) => balances[account.provider]);
    }
}

module.exports = {
    ACCOUNTS,
    ACCOUNT_KEYS,
    AccountService,
    computeBalances,
    isValidProvider,
    getAccount,
    getAccountLabel,
};
