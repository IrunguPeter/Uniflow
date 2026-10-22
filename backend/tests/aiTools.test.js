/**
 * Exercises the AI tool layer without needing a live model.
 * The model call is stubbed so the loop, the tools and the confirmation
 * flow can be checked deterministically.
 */
const path = require('path');
process.chdir(path.join(__dirname, '..'));

const AiFinancialAdvisor = require('../services/aiService');
const { TOOLS, requestTool, confirmAction, cancelAction } = require('../services/aiTools');
const { categorizePending } = require('../services/categorizationService');
const Transaction = require('../models/Transaction');
const PendingTransaction = require('../models/PendingTransaction');
const AiAction = require('../models/AiAction');
const sequelize = require('../services/db');

const UID = 'agent-test-user';

// The real model call — restored for the Gemini section, which exercises the
// actual request path rather than the stub.
const realRequestWithTools = AiFinancialAdvisor.requestWithTools;

function ok(label, condition, extra = '') {
    console.log(`${condition ? 'PASS' : 'FAIL'}  ${label}${extra ? ` — ${extra}` : ''}`);
    if (!condition) process.exitCode = 1;
}

/** Replace the model with a scripted sequence of replies. */
function stubModel(script) {
    let call = 0;
    AiFinancialAdvisor.requestWithTools = async () => {
        const step = script[Math.min(call, script.length - 1)];
        call += 1;
        return { text: step.text || '', toolCalls: step.toolCalls || [] };
    };
}
async function reset() {
    await Transaction.destroy({ where: { userId: UID } });
    await PendingTransaction.destroy({ where: { userId: UID } });
    await AiAction.destroy({ where: { userId: UID } });
}

(async () => {
    await sequelize.authenticate();
    await sequelize.sync();
    await reset();

    // ── Tool schema ────────────────────────────────────────────────
    console.log('\n— tool schema —');
    ok('8 tools exposed', TOOLS.length === 8, `${TOOLS.length}`);
    ok('every tool has a name and parameters',
        TOOLS.every(t => t.function?.name && t.function?.parameters?.type === 'object'));
    ok('every tool has a description',
        TOOLS.every(t => typeof t.function.description === 'string' && t.function.description.length > 10));

    // ── The model edits a transaction ──────────────────────────────
    console.log('\n— model edits a transaction —');
    const tx = await Transaction.create({
        userId: UID, amount: 350, description: 'Paid to KPLC PREPAID',
        category: 'Utilities & Bills', type: 'expense', provider: 'MPESA',
    });

    stubModel([
        { text: '', toolCalls: [{ id: 'c1', name: 'list_transactions', arguments: JSON.stringify({ query: 'KPLC' }) }] },
        { text: '', toolCalls: [{ id: 'c2', name: 'update_transaction', arguments: JSON.stringify({ id: tx.id, category: 'Food & Dining' }) }] },
        { text: 'Done — I moved it to Food & Dining.', toolCalls: [] },
    ]);

    const chat = await AiFinancialAdvisor.chatWithTools(
        'change the KPLC one to food',
        { balance: 0, recentTransactions: [] },
        [],
        { tools: TOOLS, requestTool: (name, args) => requestTool(name, args, UID), userId: UID }
    );

    const updated = await Transaction.findByPk(tx.id);
    ok('transaction category changed', updated.category === 'Food & Dining', updated.category);
    ok('amount untouched', updated.amount === 350, String(updated.amount));
    ok('reply returned', typeof chat.reply === 'string' && chat.reply.length > 0, chat.reply);
    ok('activity recorded', chat.activity.length === 2, `${chat.activity.length} actions`);
    ok('both actions succeeded', chat.activity.every(a => a.ok));
    ok('audit trail written', await AiAction.count({ where: { userId: UID } }) === 2);
    ok('no pending confirmations', chat.pendingActions.length === 0);

    // ── Destructive action needs confirmation ──────────────────────
    console.log('\n— destructive action needs confirmation —');
    stubModel([
        { text: '', toolCalls: [{ id: 'd1', name: 'delete_transaction', arguments: JSON.stringify({ id: tx.id }) }] },
        { text: 'I need your OK before I delete that.', toolCalls: [] },
    ]);

    const del = await AiFinancialAdvisor.chatWithTools(
        'delete the KPLC one',
        {}, [],
        { tools: TOOLS, requestTool: (name, args) => requestTool(name, args, UID), userId: UID }
    );

    ok('delete not executed yet', (await Transaction.findByPk(tx.id)) !== null);
    ok('pending action returned', del.pendingActions.length === 1, `${del.pendingActions.length}`);
    ok('pending action flagged', del.pendingActions[0].requiresConfirmation !== false);
    ok('pending action has a summary', typeof del.pendingActions[0].summary === 'string');

    const actionId = del.pendingActions[0].id;
    const cancelled = await cancelAction(UID, actionId);
    ok('action cancelled', cancelled.status === 'cancelled', cancelled.status);
    ok('transaction still there after cancel', (await Transaction.findByPk(tx.id)) !== null);

    // Confirm path
    stubModel([
        { text: '', toolCalls: [{ id: 'd2', name: 'delete_transaction', arguments: JSON.stringify({ id: tx.id }) }] },
        { text: 'Say the word and it is gone.', toolCalls: [] },
    ]);
    const del2 = await AiFinancialAdvisor.chatWithTools(
        'delete the KPLC one',
        {}, [],
        { tools: TOOLS, requestTool: (name, args) => requestTool(name, args, UID), userId: UID }
    );
    const confirmed = await confirmAction(UID, del2.pendingActions[0].id);
    ok('confirmed action executed', confirmed.action.status === 'executed', confirmed.action.status);
    ok('transaction deleted', (await Transaction.findByPk(tx.id)) === null);

    // Confirming twice must fail
    let doubleConfirmError = null;
    try { await confirmAction(UID, del2.pendingActions[0].id); } catch (e) { doubleConfirmError = e; }
    ok('double confirm rejected', doubleConfirmError !== null, doubleConfirmError?.message);

    // ── Tool guards ────────────────────────────────────────────────
    console.log('\n— tool guards —');
    const guardTx = await Transaction.create({
        userId: UID, amount: 100, description: 'Guard test', category: 'Other',
        type: 'expense', provider: 'MPESA',
    });

    const badAccount = await requestTool('update_transaction', { id: guardTx.id, provider: 'PAYPAL' }, UID);
    ok('invalid account rejected', badAccount.ok === false, badAccount.error);

    const negative = await requestTool('update_transaction', { id: guardTx.id, amount: -10 }, UID);
    ok('negative amount rejected', negative.ok === false, negative.error);

    const badField = await requestTool('update_transaction', { id: guardTx.id, userId: 'someone-else' }, UID);
    ok('non-editable field rejected', badField.ok === false, badField.error);

    const unknownTool = await requestTool('do_something_weird', {}, UID);
    ok('unknown tool rejected', unknownTool.ok === false, unknownTool.error);

    const badTransfer = await requestTool('record_transfer', { from: 'MPESA', to: 'MPESA', amount: 10 }, UID);
    ok('same-account transfer rejected', badTransfer.ok === false, badTransfer.error);

    const missing = await requestTool('update_transaction', { id: 999999, amount: 10 }, UID);
    ok('missing transaction rejected', missing.ok === false, missing.error);

    await guardTx.destroy();

    // ── Transfer tool moves balances, not totals ───────────────────
    console.log('\n— transfer tool —');
    await Transaction.create({
        userId: UID, amount: 5000, description: 'Allowance', category: 'Allowance & Gifts',
        type: 'income', provider: 'MPESA',
    });
    const transfer = await requestTool('record_transfer', { from: 'MPESA', to: 'CASH', amount: 1000 }, UID);
    ok('transfer created', transfer.ok === true, transfer.error || '');
    const { AccountService } = require('../services/accountService');
    const balances = await AccountService.getBalances(UID);
    ok('M-Pesa down by 1000', balances.MPESA.balance === 4000, String(balances.MPESA.balance));
    ok('Cash up by 1000', balances.CASH.balance === 1000, String(balances.CASH.balance));
    ok('income total unchanged', balances.MPESA.income === 5000, String(balances.MPESA.income));

    // ── Auto-categorize pending ────────────────────────────────────
    console.log('\n— auto-categorize —');
    await PendingTransaction.create({
        userId: UID, rawSms: 'M-PESA Confirmed. Paid Ksh 350 to KPLC PREPAID on 21/10/2026 10:00',
        amount: 350, type: 'expense', counterparty: 'KPLC PREPAID',
        suggestedDescription: 'Paid to KPLC PREPAID', status: 'pending',
    });
    await PendingTransaction.create({
        userId: UID, rawSms: 'M-PESA AGENT Confirmed. Withdrawn from M-PESA at AGENT on 21/10/2026 11:00, Ksh 500.00',
        amount: 500, type: 'transfer', counterparty: 'AGENT',
        suggestedDescription: 'Cash withdrawal from M-Pesa at AGENT',
        fromProvider: 'MPESA', toProvider: 'CASH', status: 'pending',
    });

    const result = await categorizePending(UID);
    ok('two pending processed', result.categorized === 2, `categorized=${result.categorized}`);
    ok('no pending left', await PendingTransaction.count({ where: { userId: UID, status: 'pending' } }) === 0);
    const logged = await Transaction.findAll({ where: { userId: UID } });
    ok('utilities category applied',
        logged.some(t => t.category === 'Utilities & Bills'), logged.map(t => t.category).join(', '));
    ok('withdrawal logged as transfer',
        logged.some(t => t.type === 'transfer' && t.provider === 'MPESA' && t.toProvider === 'CASH'));

    // ── Gemini adapter ─────────────────────────────────────────────
    // Google uses a different payload shape, so the tool schema and the
    // tool thread have to be translated. No API key needed to check that.
    console.log('\n— gemini adapter —');
    const axios = require('axios');
    const originalPost = axios.post;
    const originalProvider = process.env.GEMMA_PROVIDER;
    const originalKey = process.env.GEMMA_API_KEY;

    process.env.GEMMA_PROVIDER = 'google';
    process.env.GEMMA_API_KEY = 'test-key';
    AiFinancialAdvisor.requestWithTools = realRequestWithTools;

    let sent = null;
    axios.post = async (url, payload) => {
        sent = { url, payload };
        return {
            data: {
                candidates: [{
                    content: {
                        parts: [
                            { functionCall: { name: 'update_transaction', args: { id: 7, category: 'Food & Dining' } } },
                        ],
                    },
                }],
            },
        };
    };

    const geminiReply = await AiFinancialAdvisor.requestWithTools(
        [
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'edit it' },
        ],
        TOOLS
    );

    ok('gemini tool call read back', geminiReply.toolCalls.length === 1, JSON.stringify(geminiReply.toolCalls));
    ok('gemini tool name kept', geminiReply.toolCalls[0]?.name === 'update_transaction');
    ok('gemini args parsed', JSON.parse(geminiReply.toolCalls[0]?.arguments || '{}').id === 7);
    ok('gemini gets functionDeclarations',
        Array.isArray(sent.payload.tools) && Array.isArray(sent.payload.tools[0].functionDeclarations));
    ok('gemini schema types upper-cased',
        sent.payload.tools[0].functionDeclarations[0].parameters.type === 'OBJECT');
    ok('gemini gets toolConfig AUTO',
        sent.payload.toolConfig?.functionCallingConfig?.mode === 'AUTO');

    // A tool thread must survive the translation back into Gemini contents
    axios.post = async (url, payload) => {
        sent = { url, payload };
        return { data: { candidates: [{ content: { parts: [{ text: 'done' }] } }] } };
    };

    await AiFinancialAdvisor.requestWithTools(
        [
            { role: 'system', content: 'sys' },
            { role: 'user', content: 'delete it' },
            {
                role: 'assistant',
                content: '',
                tool_calls: [{ id: 'c1', type: 'function', function: { name: 'delete_transaction', arguments: '{"id":7}' } }],
            },
            { role: 'tool', tool_call_id: 'c1', name: 'delete_transaction', content: '{"ok":false}' },
        ],
        TOOLS
    );

    const geminiContents = sent.payload.contents;
    ok('gemini thread keeps the model turn',
        geminiContents.some(c => c.role === 'model' && c.parts.some(p => p.functionCall)));
    ok('gemini thread keeps the tool result',
        geminiContents.some(c => c.parts.some(p => p.functionResponse && p.functionResponse.name === 'delete_transaction')));

    axios.post = originalPost;
    if (originalProvider === undefined) delete process.env.GEMMA_PROVIDER;
    else process.env.GEMMA_PROVIDER = originalProvider;
    if (originalKey === undefined) delete process.env.GEMMA_API_KEY;
    else process.env.GEMMA_API_KEY = originalKey;

    await reset();
    await sequelize.close();
    console.log('\ndone');
})().catch((error) => {
    console.error('TEST ERROR:', error);
    process.exit(1);
});
