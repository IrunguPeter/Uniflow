const axios = require('axios');
require('dotenv').config();

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

class AiFinancialAdvisor {
    static async callAI(messages) {
        const provider = process.env.GEMMA_PROVIDER || 'google';
        const apiKey = process.env.GEMMA_API_KEY;

        if (!apiKey) {
            throw new Error('GEMMA_API_KEY not set in .env');
        }

        if (provider === 'google') {
            const model = process.env.GEMMA_MODEL || 'gemma-4-31b-it';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
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
                generationConfig: { maxOutputTokens: 512, temperature: 0.7 }
            });
            return response.data.candidates[0].content.parts[0].text;
        }

        // Groq / OpenRouter / any OpenAI-compatible API
        const url = provider === 'groq'
            ? 'https://api.groq.com/openai/v1/chat/completions'
            : 'https://openrouter.ai/api/v1/chat/completions';

        const response = await axios.post(url, {
            model: process.env.GEMMA_MODEL || 'llama-3.3-70b-versatile',
            messages,
            max_tokens: 512,
            temperature: 0.7
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        return response.data.choices[0].message.content;
    }

    static async parseMpesaSMS(smsText) {
        try {
            const messages = [
                { role: 'system', content: SMS_PARSE_PROMPT },
                { role: 'user', content: smsText }
            ];
            
            const response = await this.callAI(messages);
            
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                return { isMpesa: false };
            }
            
            return JSON.parse(jsonMatch[0]);
        } catch (error) {
            console.error('AI SMS Parse Error:', error.message);
            return { isMpesa: false, error: error.message };
        }
    }

    static async getSpendingAdvice(userData) {
        const { totalSpent, weeklyLimit, remaining, percentageUsed, status, recentTransactions } = userData;

        const prompt = `Current Context:
- Weekly Budget: ${weeklyLimit} KES
- Amount Spent: ${totalSpent} KES
- Remaining: ${remaining} KES
- Budget Usage: ${percentageUsed.toFixed(2)}%
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
            console.error('AI API Error:', error.message);
            return "Keep an eye on your spending, you've got this!";
        }
    }

    static async chat(userMessage, financialContext, chatHistory = []) {
        const contextPrompt = `Student's Financial Snapshot:
- Total Balance: Ksh ${(financialContext.balance || 0).toLocaleString()}
- M-Pesa Balance: Ksh ${(financialContext.mpesaBalance || 0).toLocaleString()}
- Bank Balance: Ksh ${(financialContext.bankBalance || 0).toLocaleString()}
- Weekly Budget: Ksh ${(financialContext.weeklyLimit || 0).toLocaleString()}
- Spent This Week: Ksh ${(financialContext.totalSpent || 0).toLocaleString()}
- Remaining: Ksh ${(financialContext.remaining || 0).toLocaleString()}
- Budget Status: ${financialContext.status || 'OK'}
- Recent Transactions: ${JSON.stringify(financialContext.recentTransactions || [])}
- Top Expense Categories: ${JSON.stringify(financialContext.topCategories || [])}`;

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextPrompt },
            ...chatHistory.filter(m => m.role !== 'system'),
            { role: 'user', content: userMessage }
        ];

        try {
            return await this.callAI(messages);
        } catch (error) {
            console.error('AI Chat Error:', error.message);
            return "I'm having trouble connecting right now. Try again in a moment — I've got your back!";
        }
    }
}

module.exports = AiFinancialAdvisor;
