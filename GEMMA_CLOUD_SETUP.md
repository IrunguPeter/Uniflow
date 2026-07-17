# Gemma 4 Cloud Integration Guide

This document explains how to connect UniFlow Finance to a **Gemma 4 cloud model** instead of the default local Ollama endpoint.

---

## Current Setup (Local Ollama)

By default, the app calls a local Ollama server at `http://localhost:11434`:

```env
GEMMA_API_URL=http://localhost:11434/api/chat
GEMMA_MODEL=gemma4:31b-cloud
```

This works for development but is not suitable for production or mobile deployment.

---

## Switching to Gemma 4 Cloud

### Step 1: Get a Gemma 4 API Key

You can access Gemma 4 through these providers:

| Provider | Endpoint | Auth Header |
|----------|----------|-------------|
| **Google AI Studio** | `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b:generateContent` | `x-goog-api-key: YOUR_KEY` |
| **OpenRouter** | `https://openrouter.ai/api/v1/chat/completions` | `Authorization: Bearer YOUR_KEY` |
| **Groq** | `https://api.groq.com/openai/v1/chat/completions` | `Authorization: Bearer YOUR_KEY` |
| **Self-hosted (vLLM/TGI)** | Your custom endpoint | Varies |

### Step 2: Create a `.env` file in `/backend`

```env
# Option A: Google AI Studio
GEMMA_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b:generateContent
GEMMA_API_KEY=your-google-api-key
GEMMA_PROVIDER=google

# Option B: OpenRouter
GEMMA_API_URL=https://openrouter.ai/api/v1/chat/completions
GEMMA_API_KEY=your-openrouter-key
GEMMA_PROVIDER=openrouter

# Option C: Groq
GEMMA_API_URL=https://api.groq.com/openai/v1/chat/completions
GEMMA_API_KEY=your-groq-key
GEMMA_PROVIDER=groq

# Option D: Self-hosted
GEMMA_API_URL=https://your-server.com/v1/chat/completions
GEMMA_API_KEY=your-key
GEMMA_PROVIDER=openai
```

### Step 3: Update `aiService.js`

Modify the API call in `backend/services/aiService.js` to support multiple providers:

```javascript
// Replace the existing axios call in getSpendingAdvice() and chat()

static async callGemma(messages, systemPrompt) {
    const provider = process.env.GEMMA_PROVIDER || 'ollama';
    const url = process.env.GEMMA_API_URL || 'http://localhost:11434/api/chat';
    const apiKey = process.env.GEMMA_API_KEY;

    if (provider === 'ollama') {
        // Ollama format (default, no changes needed)
        const response = await axios.post(url, {
            model: process.env.GEMMA_MODEL || 'gemma4:31b-cloud',
            messages: [{ role: 'system', content: systemPrompt }, ...messages],
            stream: false
        });
        return response.data.message.content;
    }

    if (provider === 'google') {
        // Google AI Studio format
        const contents = messages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));
        const response = await axios.post(
            `${url}?key=${apiKey}`,
            {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: { maxOutputTokens: 500 }
            }
        );
        return response.data.candidates[0].content.parts[0].text;
    }

    // OpenAI-compatible format (OpenRouter, Groq, self-hosted)
    const response = await axios.post(url, {
        model: process.env.GEMMA_MODEL || 'gemma-4-31b-it',
        messages: [
            { role: 'system', content: systemPrompt },
            ...messages
        ],
        max_tokens: 500,
        temperature: 0.7
    }, {
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    return response.data.choices[0].message.content;
}
```

### Step 4: Update the Ollama endpoint for chat

The existing `chat()` method in `aiService.js` already uses `/api/chat` which is the correct Ollama chat endpoint. When switching to cloud, the `callGemma()` helper above normalizes the differences.

---

## Security Notes

- **Never commit `.env` files** to the repository
- Use environment variables in production (e.g., Vercel, Railway, Render)
- Consider rate-limiting the `/api/finance/chat` endpoint in production
- API keys should be stored server-side only — never send them to the frontend

---

## Cost Considerations

| Provider | Free Tier | Cost per 1M tokens |
|----------|-----------|---------------------|
| Google AI Studio | 60 req/min, 1500 req/day | ~$1.25 input / $5.00 output |
| OpenRouter | Limited credits | Varies by model |
| Groq | 30 req/min free | ~$0.27 input / $0.27 output |

For a student budgeting app, the Google AI Studio free tier or Groq are the most cost-effective options.

---

## Testing the Connection

After configuration, test with:

```bash
curl -X POST http://localhost:5000/api/finance/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "How much did I spend this week?", "userId": "demo-user"}'
```

The response should contain an AI-generated financial insight based on the user's actual transaction data.
