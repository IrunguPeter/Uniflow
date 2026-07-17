const axios = require('axios');
require('dotenv').config();

const SYSTEM_PROMPT = `You are UniFlow AI, a friendly and knowledgeable financial advisor for university students in Kenya.
You have access to the student's real financial data. Use it to give specific, actionable advice.
Speak naturally using Kenyan student slang occasionally (e.g., "ku-survive", "shillings", "hustle").
Be encouraging, not lecturing. Be concise — keep responses under 4 sentences unless asked for detail.
You can analyze spending patterns, suggest savings strategies, and help plan budgets.`;

class AiFinancialAdvisor {
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
            const response = await axios.post(process.env.GEMMA_API_URL || 'http://localhost:11434/api/generate', {
                model: process.env.GEMMA_MODEL || 'gemma4:31b-cloud',
                prompt: prompt,
                system: SYSTEM_PROMPT,
                stream: false
            });
            return response.data.response;
        } catch (error) {
            console.error('Gemma 4 API Error:', error);
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

        const messages = chatHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        messages.push({ role: 'user', content: userMessage });

        try {
            const ollamaMessages = [
                { role: 'system', content: SYSTEM_PROMPT + '\n\n' + contextPrompt },
                ...messages
            ];

            const response = await axios.post(process.env.GEMMA_API_URL || 'http://localhost:11434/api/chat', {
                model: process.env.GEMMA_MODEL || 'gemma4:31b-cloud',
                messages: ollamaMessages,
                stream: false
            });

            return response.data.message.content;
        } catch (error) {
            console.error('Gemma 4 Chat Error:', error);
            return "I'm having trouble connecting right now. Try again in a moment — I've got your back!";
        }
    }
}

module.exports = AiFinancialAdvisor;
