# UniFlow Finance

An AI-driven financial survival engine for Kenyan university students. Tracks M-Pesa and bank transactions, manages budgets, and provides personalized financial coaching powered by Gemma 4.

## Project Structure

```
├── backend/               # Node.js/Express API
│   ├── models/            # Sequelize models (User, Transaction, RecurringExpense, ChatMessage)
│   ├── routes/            # financeRoutes.js — all API endpoints
│   ├── services/          # budgetService, aiService, helbService, db
│   └── utils/             # mpesaParser.js — regex-based SMS parser
│
├── frontend/              # React.js mobile-first web app
│   ├── src/pages/         # Dashboard, Charts, Chat, AddTransaction, Transactions,
│   │                      # HelbPlanner, RecurringExpenses, ParseSms
│   └── src/services/      # financeApi.js — Axios API client
│
├── GEMMA_CLOUD_SETUP.md   # Instructions for connecting to Gemma 4 cloud
└── WRITEUP.md             # Project writeup
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Tailwind CSS, Framer Motion, Recharts |
| Backend | Node.js, Express.js, Sequelize ORM, SQLite |
| AI | Groq (Llama 3.3 70B or other models) |

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
npm run dev          # starts on port 5000
```

#### Frontend
```bash
cd frontend
npm install
npm start            # starts on port 3000
```

### Environment Variables (backend `.env`)
```env
GEMMA_PROVIDER=groq
GEMMA_API_KEY=your-groq-key
GEMMA_MODEL=llama-3.3-70b-versatile
PORT=5000
```

## Features

### Dashboard
- Total balance with separate **M-Pesa** and **Bank** breakdowns
- Weekly budget progress bar with recurring expense deductions
- AI-powered financial tips from Gemma 4
- Quick actions for adding transactions and managing recurring expenses

### Transaction Logging
- Expense and income toggle with category selection
- Account picker (M-Pesa, NCBA, I&M, Cash)
- Full transaction history with category icons and color coding

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
| POST | `/api/finance/parse-sms` | Parse M-Pesa SMS and log transaction |
| POST | `/api/finance/helb-calculate` | HELB loan weekly allocation calculator |
| GET | `/api/finance/recurring-expenses` | List recurring expenses |
| POST | `/api/finance/recurring-expenses` | Add recurring expense |
| DELETE | `/api/finance/recurring-expenses/:id` | Remove recurring expense |
| GET | `/api/finance/chat/history` | Get AI chat history |
| POST | `/api/finance/chat` | Send message to AI advisor |
| DELETE | `/api/finance/chat/history` | Clear chat history |
| GET | `/api/finance/charts` | Aggregated data for charts |

## Connecting to Gemma 4 Cloud

See [`GEMMA_CLOUD_SETUP.md`](GEMMA_CLOUD_SETUP.md) for instructions on switching from local Ollama to Google AI Studio, OpenRouter, Groq, or a self-hosted Gemma 4 endpoint.
# Uniflow
# Money-manager
