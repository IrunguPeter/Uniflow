const Transaction = require('../models/Transaction');
const PendingTransaction = require('../models/PendingTransaction');
const { detectCategory } = require('../utils/mpesaParser');
const { TransferService } = require('./transferService');
const { VALID_CATEGORIES } = require('./transactionService');

/**
 * Work out a category for a pending transaction.
 *
 * The keyword rules in mpesaParser handle the obvious cases (KPLC, Naivas,
 * Uber...). Anything they cannot place is handed to the AI, but only if the
 * AI is actually configured — otherwise the transaction falls back to
 * "Other" rather than failing.
 */
function ruleCategory(pending) {
    const text = `${pending.counterparty || ''} ${pending.suggestedDescription || ''} ${pending.rawSms || ''}`;
    return detectCategory(text, pending.type);
}

/**
 * Categorize (and log) the user's pending transactions in one go.
 */
async function categorizePending(userId, { limit = 25 } = {}) {
    const pending = await PendingTransaction.findAll({
        where: { userId, status: 'pending' },
        order: [['timestamp', 'DESC']],
        limit: Math.min(Number(limit) || 25, 100),
    });

    if (pending.length === 0) {
        return { categorized: 0, skipped: 0, items: [], aiUsed: false };
    }

    // 1. Rules first — cheap, deterministic and right most of the time
    const decisions = pending.map((p) => {
        if (p.fromProvider && p.toProvider) {
            return { pending: p, category: 'Transfer', source: 'transfer' };
        }
        return { pending: p, category: ruleCategory(p), source: 'rules' };
    });

    // 2. Only the leftovers go to the AI
    const ambiguous = decisions.filter((d) => d.source === 'rules' && d.category === 'Other');
    let aiUsed = false;

    if (ambiguous.length > 0) {
        try {
            const AiFinancialAdvisor = require('./aiService');
            const aiCategories = await AiFinancialAdvisor.categorizeTransactions(
                ambiguous.map((d) => ({
                    id: d.pending.id,
                    amount: d.pending.amount,
                    type: d.pending.type,
                    counterparty: d.pending.counterparty,
                    description: d.pending.suggestedDescription,
                })),
                VALID_CATEGORIES
            );

            aiUsed = true;
            for (const decision of decisions) {
                const aiCategory = aiCategories[decision.pending.id];
                if (aiCategory && VALID_CATEGORIES.includes(aiCategory)) {
                    decision.category = aiCategory;
                    decision.source = 'ai';
                }
            }
        } catch (error) {
            // No AI available — the rule-based categories still stand
            console.warn('AI categorization unavailable:', error.message);
        }
    }

    // 3. Log them onto the ledger
    const items = [];
    let skipped = 0;

    for (const decision of decisions) {
        const p = decision.pending;
        try {
            if (decision.source === 'transfer') {
                const transfer = await TransferService.create({
                    userId,
                    from: p.fromProvider,
                    to: p.toProvider,
                    amount: p.amount,
                    description: p.suggestedDescription,
                    timestamp: p.timestamp,
                    transactionReference: p.transactionReference,
                    force: true,
                });
                await p.update({ status: 'categorized' });
                items.push({
                    pendingId: p.id,
                    transactionId: transfer.id,
                    category: 'Transfer',
                    source: 'transfer',
                    description: transfer.description,
                    amount: p.amount,
                });
                continue;
            }

            const transaction = await Transaction.create({
                userId,
                amount: p.amount,
                description: (p.suggestedDescription || 'M-Pesa Transaction').trim(),
                category: decision.category,
                type: p.type,
                provider: 'MPESA',
                transactionReference: p.transactionReference,
                timestamp: p.timestamp,
            });
            await p.update({ status: 'categorized' });

            items.push({
                pendingId: p.id,
                transactionId: transaction.id,
                category: decision.category,
                source: decision.source,
                description: transaction.description,
                amount: p.amount,
            });
        } catch (error) {
            skipped += 1;
            console.error('Auto-categorize failed for pending', p.id, error.message);
        }
    }

    return { categorized: items.length, skipped, items, aiUsed };
}

module.exports = { categorizePending, ruleCategory };
