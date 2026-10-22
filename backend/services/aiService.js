const axios = require('axios');
require('../env');

const SYSTEM_PROMPT = `You are UniFlow AI, a friendly and knowledgeable financial advisor for university students in Kenya.
You have access to the student's real financial data. Use it to give specific, actionable advice.
Speak naturally using Kenyan student slang occasionally (e.g., "ku-survive", "shillings", "hustle").
Be encouraging, not lecturing. Be concise — keep responses under 4 sentences unless asked for detail.
You can analyze spending patterns, suggest savings strategies, and help plan budgets.`;

const SMS_PARSE_PROMPT = `You are an M-Pesa SMS parser. Extract transaction details from Safaricom M-Pesa messages.

Return ONLY a JSON object with these fields:
{
  "isMpesa": true/false,
  "type": "income" | "expense" | "transfer",
  "amount": number,
  "reference": "transaction code",
  "counterparty": "person or business name",
  "timestamp": "ISO date string or null",
  "description": "brief description of what this was for"
}

Rules:
- "sent to" = expense, "received from" = income, "paid to" = expense
- "withdrawn" = expense
- Extract the transaction code (e.g., UE5JK2ZT6H)
- If you can't determine the category, set description to "Unknown - needs categorization"
- Return ONLY the JSON, no explanation`;

const TOOL_PROMPT = `You can act on the student's ledger using the tools provided.

Rules:
- Call a tool when the student asks for something to be changed. Do not just describe the change — actually make it.
- To edit a transaction, call list_transactions first to find its id, then update_transaction.
- If several transactions match, list them and ask the student which one they mean.
- After a tool runs, tell the student in plain language what changed.
- Never invent a transaction id. Only use ids returned by a tool.
- Transfers move money between the student's own accounts. They are not spending.
- If a tool reports it needs confirmation, explain what you want to do and ask them to approve it.`;

const REQUEST_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '512', 10);

// How many times the model may call tools before we call it a day
const MAX_TOOL_ITERATIONS = 6;

// OpenAI-compatible providers. 'google' is handled separately (different payload shape).
const PROVIDERS = {
    groq: {
        baseUrl: 'https://api.groq.com/openai/v1',
        keyVars: ['GROQ_API_KEY', 'GEMMA_API_KEY'],
        defaultModel: 'openai/gpt-oss-120b',
        modelsPath: '/models'
    },
    openrouter: {
        baseUrl: 'https://openrouter.ai/api/v1',
        keyVars: ['OPENROUTER_API_KEY'],
        defaultModel: 'openai/gpt-oss-120b',
        modelsPath: '/models'
    },
    openai: {
        baseUrl: 'https://api.openai.com/v1',
        keyVars: ['OPENAI_API_KEY'],
        defaultModel: 'gpt-4o-mini',
        modelsPath: '/models'
    },
    google: {
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        keyVars: ['GEMMA_API_KEY', 'GOOGLE_API_KEY'],
        defaultModel: 'gemma-3-27b-it',
        modelsPath: null
    }
};

// Preferred chat models, best first. Used when the configured model is unavailable.
const MODEL_PREFERENCE = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
    'qwen/qwen3-32b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant',
    'allam-2-7b'
];

// Models that cannot serve chat/completions (speech-to-text, moderation, gated models).
const NON_CHAT_PATTERN = /whisper|prompt-guard|safeguard|guard|orpheus/i;

const resolvedModels = {};
const modelLists = {};

// Gemini uses its own casing for JSON-schema types
const GEMINI_TYPES = {
    object: 'OBJECT',
    string: 'STRING',
    number: 'NUMBER',
    integer: 'INTEGER',
    boolean: 'BOOLEAN',
    array: 'ARRAY',
};

/**
 * Convert an OpenAI-style function definition into Gemini's
 * functionDeclarations shape.
 */
function toGeminiSchema(tool) {
    const fn = tool.function || {};
    const parameters = fn.parameters || { type: 'object', properties: {} };

    const convert = (schema) => {
        if (!schema || typeof schema !== 'object') return schema;
        const converted = { ...schema };
        if (converted.type) converted.type = GEMINI_TYPES[converted.type] || converted.type;
        if (converted.properties) {
            converted.properties = Object.fromEntries(
                Object.entries(converted.properties).map(([key, value]) => [key, convert(value)])
            );
        }
        if (converted.items) converted.items = convert(converted.items);
        return converted;
    };

    return {
        name: fn.name,
        description: fn.description,
        parameters: convert(parameters),
    };
}

function isModelUnavailable(error) {
    const response = error && error.response;
    const status = response && response.status;
    const body = response && response.data;
    const code = body && body.error && body.error.code;
    const message = (body && body.error && body.error.message) || (error && error.message) || '';
    return status === 404
        || code === 'model_not_found'
        || /does not exist or you do not have access/i.test(message);
}

function describeError(error) {
    const response = error && error.response;
    if (!response) return error.message;
    const body = response.data;
    const detail = (body && body.error && body.error.message)
        || (body && body.message)
        || (typeof body === 'string' ? body : '');
    return `HTTP ${response.status}${detail ? ` - ${detail}` : ''}`;
}

class AiFinancialAdvisor {
    static getProvider() {
        const raw = (process.env.GEMMA_PROVIDER || process.env.AI_PROVIDER || 'groq').toLowerCase().trim();
        if (raw === 'gemini' || raw === 'googleai') return 'google';
        if (PROVIDERS[raw]) return raw;
        console.warn(`AI: unknown provider "${raw}", falling back to groq`);
        return 'groq';
    }

    static getApiKey() {
        const config = PROVIDERS[this.getProvider()];
        for (const name of config.keyVars) {
            if (process.env[name]) return process.env[name];
        }
        return null;
    }

    static getConfiguredModel() {
        return process.env.AI_MODEL || process.env.GEMMA_MODEL || PROVIDERS[this.getProvider()].defaultModel;
    }

    static async listModels(provider, apiKey) {
        const config = PROVIDERS[provider];
        if (!config.modelsPath) return [];
        if (modelLists[provider]) return modelLists[provider];

        const response = await axios.get(`${config.baseUrl}${config.modelsPath}`, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: REQUEST_TIMEOUT
        });
        modelLists[provider] = (response.data.data || []).map(m => m.id);
        return modelLists[provider];
    }

    static async resolveAvailableModel(provider, apiKey) {
        try {
            const available = (await this.listModels(provider, apiKey)).filter(id => !NON_CHAT_PATTERN.test(id));
            for (const preferred of MODEL_PREFERENCE) {
                if (available.includes(preferred)) return preferred;
            }
            return available[0] || null;
        } catch (error) {
            console.error('AI: could not list available models:', error.message);
            return null;
        }
    }

    static async chatRequest(url, apiKey, model, messages, maxTokens, tools = null, temperature = 0.7) {
        const payload = {
            model,
            messages,
            max_tokens: maxTokens,
            temperature
        };
        if (tools && tools.length) {
            payload.tools = tools;
            payload.tool_choice = 'auto';
        }

        const response = await axios.post(url, payload, {
            headers: { Authorization: `Bearer ${apiKey}` },
            timeout: REQUEST_TIMEOUT
        });
        return response;
    }

    static extractContent(response) {
        const choice = response.data && response.data.choices && response.data.choices[0];
        const content = choice && choice.message && choice.message.content;
        return content && content.trim() ? content.trim() : null;
    }

    /** Pull the tool calls out of an OpenAI-compatible response. */
    static extractToolCalls(response) {
        const choice = response.data && response.data.choices && response.data.choices[0];
        const calls = (choice && choice.message && choice.message.tool_calls) || [];
        return calls
            .filter(call => call && call.function && call.function.name)
            .map(call => ({
                id: call.id || `call_${call.function.name}_${Date.now()}`,
                name: call.function.name,
                arguments: call.function.arguments || '{}'
            }));
    }

    /** Record the assistant's turn so the next request keeps the thread. */
    static appendAssistantTurn(messages, text, toolCalls) {
        messages.push({
            role: 'assistant',
            content: text || '',
            tool_calls: toolCalls.map(call => ({
                id: call.id,
                type: 'function',
                function: { name: call.name, arguments: call.arguments }
            }))
        });
    }

    /** Feed a tool's result back to the model. */
    static appendToolResult(messages, toolCall, result) {
        messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.name,
            content: typeof result === 'string' ? result : JSON.stringify(result)
        });
    }

    static async callAI(messages) {
        const provider = this.getProvider();

        if (provider === 'google') {
            const { text } = await this.callGoogle(messages);
            if (!text) throw new Error('AI provider returned an empty response');
            return text;
        }

        const apiKey = this.getApiKey();
        if (!apiKey) {
            const config = PROVIDERS[provider];
            throw new Error(`API key not set. Please add ${config.keyVars.join(' or ')} in your .env file`);
        }

        const url = `${PROVIDERS[provider].baseUrl}/chat/completions`;
        let model = resolvedModels[provider] || this.getConfiguredModel();

        let response;
        try {
            response = await this.chatRequest(url, apiKey, model, messages, MAX_TOKENS);
        } catch (error) {
            if (!isModelUnavailable(error)) throw error;

            const fallbackModel = await this.resolveAvailableModel(provider, apiKey);
            if (!fallbackModel) throw error;

            console.warn(`AI: model "${model}" unavailable, falling back to "${fallbackModel}"`);
            model = fallbackModel;
            resolvedModels[provider] = fallbackModel;
            response = await this.chatRequest(url, apiKey, model, messages, MAX_TOKENS);
        }

        let content = this.extractContent(response);

        // Reasoning models burn the token budget on hidden reasoning, which can
        // leave the visible answer empty. Retry once with a larger budget.
        const choice = response.data.choices && response.data.choices[0];
        if (!content && choice && choice.finish_reason === 'length') {
            response = await this.chatRequest(url, apiKey, model, messages, MAX_TOKENS * 4);
            content = this.extractContent(response);
        }

        if (!content) throw new Error('AI provider returned an empty response');
        return content;
    }

    static async callGoogle(messages, tools = null) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error(`API key not set. Please add ${PROVIDERS.google.keyVars.join(' or ')} in your .env file`);
        }

        const model = process.env.AI_MODEL || process.env.GEMMA_MODEL || PROVIDERS.google.defaultModel;
        const url = `${PROVIDERS.google.baseUrl}/models/${model}:generateContent?key=${apiKey}`;

        const systemInstruction = messages
            .filter(m => m.role === 'system')
            .map(m => m.content)
            .join('\n\n');

        // Gemini wants its own content shape, and the tool thread has to be
        // translated into functionCall / functionResponse parts.
        const contents = [];
        for (const message of messages) {
            if (message.role === 'system') continue;

            if (message.role === 'assistant') {
                const parts = [];
                if (message.content) parts.push({ text: message.content });
                for (const call of message.tool_calls || []) {
                    let args = {};
                    try { args = JSON.parse(call.function.arguments || '{}'); } catch { args = {}; }
                    parts.push({ functionCall: { name: call.function.name, args } });
                }
                if (parts.length) contents.push({ role: 'model', parts });
                continue;
            }

            if (message.role === 'tool') {
                let response = {};
                try { response = JSON.parse(message.content || '{}'); } catch { response = { result: message.content }; }
                contents.push({
                    role: 'user',
                    parts: [{ functionResponse: { name: message.name, response } }]
                });
                continue;
            }

            contents.push({ role: 'user', parts: [{ text: message.content }] });
        }

        const payload = {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.7 }
        };
        if (tools && tools.length) {
            payload.tools = [{ functionDeclarations: tools.map(toGeminiSchema) }];
            payload.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
        }

        const response = await axios.post(url, payload, { timeout: REQUEST_TIMEOUT });

        const parts = (response.data.candidates && response.data.candidates[0]
            && response.data.candidates[0].content && response.data.candidates[0].content.parts) || [];
        const text = parts.filter(p => p.text).map(p => p.text).join('').trim();
        const toolCalls = parts
            .filter(p => p.functionCall)
            .map((p, index) => ({
                id: `gemini_${p.functionCall.name}_${index}_${Date.now()}`,
                name: p.functionCall.name,
                arguments: JSON.stringify(p.functionCall.args || {})
            }));

        return { text, toolCalls };
    }

    /**
     * Send a tool-enabled request and hand back the assistant's reply plus
     * any tool calls it wants to make.
     */
    static async requestWithTools(messages, tools) {
        const provider = this.getProvider();

        if (provider === 'google') return this.callGoogle(messages, tools);

        const apiKey = this.getApiKey();
        if (!apiKey) {
            const config = PROVIDERS[provider];
            throw new Error(`API key not set. Please add ${config.keyVars.join(' or ')} in your .env file`);
        }

        const url = `${PROVIDERS[provider].baseUrl}/chat/completions`;
        let model = resolvedModels[provider] || this.getConfiguredModel();

        let response;
        try {
            response = await this.chatRequest(url, apiKey, model, messages, MAX_TOKENS, tools, 0.3);
        } catch (error) {
            if (!isModelUnavailable(error)) throw error;

            const fallbackModel = await this.resolveAvailableModel(provider, apiKey);
            if (!fallbackModel) throw error;

            console.warn(`AI: model "${model}" unavailable, falling back to "${fallbackModel}"`);
            model = fallbackModel;
            resolvedModels[provider] = fallbackModel;
            response = await this.chatRequest(url, apiKey, model, messages, MAX_TOKENS, tools, 0.3);
        }

        const message = (response.data.choices && response.data.choices[0]
            && response.data.choices[0].message) || {};

        return {
            text: (message.content || '').trim(),
            toolCalls: this.extractToolCalls(response)
        };
    }

    static async parseMpesaSMS(smsText) {
        try {
            const messages = [
                { role: 'system', content: SMS_PARSE_PROMPT },
                { role: 'user', content: smsText }
            ];

            const response = await this.callAI(messages);

            // Extract JSON from response (handle markdown code blocks)
            const trimmed = response.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
            let parsed = null;
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            }

            if (!parsed) {
                return { isMpesa: false };
            }

            return parsed;
        } catch (error) {
            console.error('AI SMS Parse Error:', describeError(error));
            return { isMpesa: false, error: error.message };
        }
    }

    static async getSpendingAdvice(userData) {
        const { totalSpent, weeklyLimit, remaining, percentageUsed, status, recentTransactions } = userData;

        const prompt = `Current Context:
- Weekly Budget: ${weeklyLimit} KES
- Amount Spent: ${totalSpent} KES
- Remaining: ${remaining} KES
- Budget Usage: ${Number(percentageUsed || 0).toFixed(2)}%
- Status: ${status}
- Recent Transactions: ${JSON.stringify(recentTransactions)}

Provide a concise, relatable financial tip (under 3 sentences).`;

        try {
            const messages = [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: prompt }
            ];
            return await this.callAI(messages);
        } catch (error) {
            console.error('AI API Error:', describeError(error));
            return "Keep an eye on your spending, you've got this!";
        }
    }

    /** The financial snapshot that gets injected into every prompt. */
    static buildContextPrompt(financialContext) {
        return `Student's Financial Snapshot:
- Total Balance: Ksh ${(financialContext.balance || 0).toLocaleString()}
- M-Pesa Balance: Ksh ${(financialContext.mpesaBalance || 0).toLocaleString()}
- Bank Balance: Ksh ${(financialContext.bankBalance || 0).toLocaleString()}
- Cash Balance: Ksh ${(financialContext.cashBalance || 0).toLocaleString()}
- Weekly Budget: Ksh ${(financialContext.weeklyLimit || 0).toLocaleString()}
- Spent This Week: Ksh ${(financialContext.totalSpent || 0).toLocaleString()}
- Remaining: Ksh ${(financialContext.remaining || 0).toLocaleString()}
- Budget Status: ${financialContext.status || 'OK'}
- Recent Transactions: ${JSON.stringify(financialContext.recentTransactions || [])}
- Top Expense Categories: ${JSON.stringify(financialContext.topCategories || [])}

Note: transactions of type "transfer" move money between the student's own accounts (M-Pesa, bank, cash). They are neither income nor spending, so never count them as either.`;
    }

    /**
     * Ask the AI to place a batch of transactions into categories.
     * Returns a map of pending-transaction id → category.
     */
    static async categorizeTransactions(items, validCategories = []) {
        if (!items || items.length === 0) return {};

        const prompt = `Categorize each M-Pesa transaction below into exactly one category.

Allowed categories: ${validCategories.join(', ')}

Transactions:
${JSON.stringify(items)}

Return ONLY a JSON array of objects, one per transaction, in the same order:
[{"id": 1, "category": "Food & Dining"}]`;

        try {
            const messages = [
                { role: 'system', content: 'You categorize Kenyan student spending. You reply with JSON only.' },
                { role: 'user', content: prompt }
            ];

            const response = await this.callAI(messages);
            const trimmed = response.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();

            let parsed = null;
            try {
                parsed = JSON.parse(trimmed);
            } catch {
                const jsonMatch = trimmed.match(/\[[\s\S]*\]/);
                if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
            }
            if (!Array.isArray(parsed)) return {};

            const map = {};
            for (const entry of parsed) {
                if (entry && entry.id !== undefined && entry.category) {
                    map[entry.id] = String(entry.category).trim();
                }
            }
            return map;
        } catch (error) {
            console.error('AI categorization error:', describeError(error));
            return {};
        }
    }

    static async chat(userMessage, financialContext, chatHistory = []) {
        const contextPrompt = this.buildContextPrompt(financialContext);

        // The caller persists the new user message before loading history, so drop a
        // trailing duplicate of the message we are about to append.
        const history = chatHistory.filter(m => m.role !== 'system');
        while (history.length
            && history[history.length - 1].role === 'user'
            && history[history.length - 1].content === userMessage) {
            history.pop();
        }

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextPrompt },
            ...history,
            { role: 'user', content: userMessage }
        ];

        try {
            return await this.callAI(messages);
        } catch (error) {
            console.error('AI Chat Error:', describeError(error));
            return "I'm having trouble connecting right now. Try again in a moment — I've got your back!";
        }
    }

    /**
     * Chat with tools.
     *
     * The model may call tools in several rounds; each call is executed
     * against the user's own data and the result is fed back in. Destructive
     * tools are not executed here — they come back as pending actions the
     * user has to approve.
     */
    static async chatWithTools(userMessage, financialContext, chatHistory = [], { tools, requestTool, userId }) {
        const history = chatHistory.filter(m => m.role !== 'system');
        while (history.length
            && history[history.length - 1].role === 'user'
            && history[history.length - 1].content === userMessage) {
            history.pop();
        }

        const messages = [
            {
                role: 'system',
                content: SYSTEM_PROMPT + '\n\n' + TOOL_PROMPT + '\n\n' + this.buildContextPrompt(financialContext)
            },
            ...history,
            { role: 'user', content: userMessage }
        ];

        const activity = [];
        const pendingActions = [];

        try {
            for (let round = 0; round < MAX_TOOL_ITERATIONS; round += 1) {
                const { text, toolCalls } = await this.requestWithTools(messages, tools);

                if (!toolCalls || toolCalls.length === 0) {
                    return {
                        reply: text || 'Done.',
                        activity,
                        pendingActions,
                        toolCalls: []
                    };
                }

                this.appendAssistantTurn(messages, text, toolCalls);

                for (const call of toolCalls) {
                    let args = {};
                    try {
                        args = JSON.parse(call.arguments || '{}');
                    } catch {
                        args = {};
                    }

                    const result = await requestTool(call.name, args, userId);

                    activity.push({
                        tool: call.name,
                        ok: result.ok !== false,
                        summary: result.summary || call.name,
                        requiresConfirmation: Boolean(result.requiresConfirmation)
                    });

                    if (result.requiresConfirmation && result.action) {
                        pendingActions.push(result.action);
                    }

                    this.appendToolResult(messages, call, result);
                }
            }

            return {
                reply: 'I made a few changes to your ledger.',
                activity,
                pendingActions,
                toolCalls: []
            };
        } catch (error) {
            console.error('AI tool chat error:', describeError(error));
            return {
                reply: "I couldn't reach my tools just now, so nothing was changed. Try again in a moment.",
                activity,
                pendingActions,
                toolCalls: [],
                error: error.message
            };
        }
    }
}

module.exports = AiFinancialAdvisor;
