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

const REQUEST_TIMEOUT = parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);
const MAX_TOKENS = parseInt(process.env.AI_MAX_TOKENS || '512', 10);

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

    static async chatRequest(url, apiKey, model, messages, maxTokens) {
        const response = await axios.post(url, {
            model,
            messages,
            max_tokens: maxTokens,
            temperature: 0.7
        }, {
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

    static async callAI(messages) {
        const provider = this.getProvider();

        if (provider === 'google') return this.callGoogle(messages);

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

    static async callGoogle(messages) {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            throw new Error(`API key not set. Please add ${PROVIDERS.google.keyVars.join(' or ')} in your .env file`);
        }

        const model = process.env.AI_MODEL || process.env.GEMMA_MODEL || PROVIDERS.google.defaultModel;
        const url = `${PROVIDERS.google.baseUrl}/models/${model}:generateContent?key=${apiKey}`;
        const contents = messages
            .filter(m => m.role !== 'system')
            .map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));
        const systemInstruction = messages
            .filter(m => m.role === 'system')
            .map(m => m.content)
            .join('\n\n');

        const response = await axios.post(url, {
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents,
            generationConfig: { maxOutputTokens: MAX_TOKENS, temperature: 0.7 }
        }, { timeout: REQUEST_TIMEOUT });

        const parts = response.data.candidates && response.data.candidates[0]
            && response.data.candidates[0].content && response.data.candidates[0].content.parts;
        const text = parts && parts.map(p => p.text).join('').trim();
        if (!text) throw new Error('AI provider returned an empty response');
        return text;
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

    static async chat(userMessage, financialContext, chatHistory = []) {
        const contextPrompt = `Student's Financial Snapshot:
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
}

module.exports = AiFinancialAdvisor;
