# UniFlow Finance

An AI-driven financial survival engine for Kenyan university students. Tracks M-Pesa and bank transactions, manages budgets, and provides personalized financial coaching powered by Groq.

## Project Structure

```
├── backend/               # Node.js/Express API
│   ├── models/            # Sequelize models (User, Transaction, RecurringExpense,
│   │                      #   ChatMessage, PendingTransaction, AiAction)
│   ├── routes/            # financeRoutes.js — all API endpoints
│   ├── services/          # budgetService, accountService, transferService,
│   │                      #   transactionService, categorizationService,
│   │                      #   aiService, aiTools, helbService, migrations, db
│   ├── tests/             # aiTools.test.js — tool + confirmation tests
│   └── utils/             # mpesaParser.js — regex-based SMS parser
│
├── frontend/              # React.js mobile-first web app
│   ├── src/pages/         # Dashboard, Charts, Chat, AddTransaction, Transactions,
│   │                      # Transfers, AiActivity, PendingTransactions,
│   │                      # HelbPlanner, RecurringExpenses, ParseSms
│   └── src/services/      # financeApi.js — Axios API client
│
├── docs/                  # bank-api-integration.md, transfers.md, ai-agent.md
└── WRITEUP.md             # Project writeup
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express.js, Sequelize ORM, SQLite |
| AI | Groq (OpenAI-compatible — Groq, OpenRouter or OpenAI) |

### Option A: Using Docker / Home Server (Recommended)
```bash
# Optional: customize ports in your root .env file:
# FRONTEND_PORT=8080
# BACKEND_PORT=5050

# Build and start both frontend and backend
docker compose up -d

# Access on your local network / home server:
# Web UI:     http://<server-ip>:8080   (or http://localhost:8080)
# Backend API: http://<server-ip>:5050   (or http://localhost:5050)
```

### Option B: Local Development

#### Backend
```bash
cd backend
npm install
npm run dev          # starts on port 5070
```

#### Frontend
```bash
cd frontend
npm install
npm start            # starts on port 3000
```

### Environment Variables (Create `.env` in root or `backend/.env`)
```env
AI_PROVIDER=groq
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMMA_MODEL=openai/gpt-oss-120b
FRONTEND_PORT=8080
BACKEND_PORT=5050
```

## Features

### Dashboard
- Total balance with separate **M-Pesa** and **Bank** breakdowns
- Weekly budget progress bar with recurring expense deductions
- AI-powered financial tips from your configured AI provider
- Quick actions for adding transactions and managing recurring expenses

### Transaction Logging
- Expense and income toggle with category selection
- Account picker (M-Pesa, NCBA, I&M, Cash)
- Full transaction history with category icons and color coding

### Transfers (bank ⇄ M-Pesa ⇄ cash)
- Move money between your own accounts: **M-Pesa → Bank → Cash** and back
- Live account balances on the transfer screen, with a before/after preview
- Transfers move balances but are **never counted as spending** — your weekly
  budget and spending-leak analysis stay honest
- Insufficient-balance guard with an explicit "record anyway" override
- Transfers show up in the Ledger with a `M-Pesa → NCBA` route, and are
  matched by the account filters
- M-Pesa SMS cash withdrawals and agent deposits are detected automatically and
  can be recorded as **M-Pesa ⇄ Cash** transfers
- See [`docs/transfers.md`](docs/transfers.md) for the data model

### M-Pesa SMS Parser
- Paste real Safaricom M-Pesa notification texts to auto-log transactions
- Supports send, receive, paybill, and withdrawal formats
- Detects transaction type and extracts amount, recipient/sender, reference

### Recurring Expenses
- Add fixed costs (rent, shopping, savings, transport, food) with weekly/monthly/semester frequency
- Automatically deducted from your weekly discretionary budget
- Weekly equivalent shown per item with total deduction summary

### AI Chat
- Conversational interface to ask about your finances
- Full context-aware: balances, budget status, recent transactions, top spending categories
- Chat history persisted in the database
- Suggestion chips for common questions

### AI Agent (acts on your ledger)
- The AI can now **edit** transactions, not just talk about them
- Tools: find, update, create, categorize, transfer and delete transactions
- "Change my KPLC transaction to Food & Dining" - it finds the row and fixes it
- **Auto-categorize all** on the Pending screen: keyword rules first, AI for the ambiguous ones
- Destructive actions (delete) wait for your confirmation
- Edits that would overdraw an account are rejected with the exact shortfall
- Every action is written to an audit trail - see the **AI Activity** page
- Tool calling works on Groq, OpenRouter, OpenAI and Google Gemini
- See [`docs/ai-agent.md`](docs/ai-agent.md)

### Charts & Analytics
- Expense breakdown pie chart by category
- Income sources pie chart
- Monthly income vs expenses bar chart
- Balance trend line chart over time

### HELB Planner
- Calculate weekly allowance from total loan amount
- Deducts fixed costs and computes savings buffer

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/finance/budget-insight` | Weekly budget + AI advice + separate balances |
| GET | `/api/finance/transactions` | Transaction history (up to 50) |
| POST | `/api/finance/transactions` | Add transaction (with validation) |
| PATCH | `/api/finance/transactions/:id` | Edit a transaction (PUT also works) |
| DELETE | `/api/finance/transactions/:id` | Remove a transaction |
| GET | `/api/finance/accounts` | Per-account balances (M-Pesa, NCBA, I&M, Cash) |
| GET | `/api/finance/transfers` | Transfer history between own accounts |
| POST | `/api/finance/transfers` | Transfer between two of your accounts |
| POST | `/api/finance/parse-sms` | Parse M-Pesa SMS and log transaction |
| POST | `/api/finance/parse-batch-sms` | Parse many M-Pesa SMS at once |
| GET | `/api/finance/pending-transactions` | Transactions awaiting categorization |
| POST | `/api/finance/pending-transactions/:id/categorize` | Categorize (or record as transfer) |
| POST | `/api/finance/pending-transactions/auto-categorize` | Categorize and log every pending SMS |
| GET | `/api/finance/ai/actions` | Audit trail of everything the AI did |
| POST | `/api/finance/ai/actions/:id/confirm` | Approve a destructive AI action |
| POST | `/api/finance/ai/actions/:id/cancel` | Discard a destructive AI action |
| POST | `/api/finance/helb-calculate` | HELB loan weekly allocation calculator |
| GET | `/api/finance/recurring-expenses` | List recurring expenses |
| POST | `/api/finance/recurring-expenses` | Add recurring expense |
| DELETE | `/api/finance/recurring-expenses/:id` | Remove recurring expense |
| GET | `/api/finance/chat/history` | Get AI chat history |
| POST | `/api/finance/chat` | Send message to AI advisor |
| DELETE | `/api/finance/chat/history` | Clear chat history |
| GET | `/api/finance/charts` | Aggregated data for charts |

## Connecting an AI Provider

UniFlow talks to any OpenAI-compatible chat endpoint. Set the provider and key in `.env`:

```env
AI_PROVIDER=groq          # groq | openrouter | openai | google
GROQ_API_KEY=gsk_...
GEMMA_MODEL=openai/gpt-oss-120b
```

If the configured model is retired by the provider, the backend logs a warning and
automatically falls back to the best chat model your key still has access to.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `API key not set` | `GROQ_API_KEY` (or `GEMMA_API_KEY`) missing — the backend reads `.env` from the repo root or from `backend/`. |
| `HTTP 404 - model_not_found` | The configured model no longer exists. Update `GEMMA_MODEL`, or let the automatic fallback pick one. |
| Chat replies with a canned apology | The provider call failed — check `docker compose logs backend` for the real error. |

# Uniflow
# Money-manager
