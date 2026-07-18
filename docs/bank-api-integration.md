# Kenyan Bank API Integration Guide

How to connect real bank accounts and M-Pesa to UniFlow Finance.

---

## 1. Safaricom Daraja 3.0 (M-Pesa)

### What you get
- STK Push (prompt user to pay or confirm via phone)
- Account balance query
- Transaction status lookup
- B2C payments (send money to user's M-Pesa)
- C2B (receive money notifications)

### Setup steps
1. Register at developer.safaricom.co.ke
2. Create an app → get **Consumer Key** and **Consumer Secret**
3. For production, apply for a **Paybill** or **Till Number** ( Safaricom reviews your use case)
4. Sandbox is instant — test with test phone numbers Safaricom provides

### Auth flow
```
POST https://sandbox.safaricom.co.ke/oauth/v1/generate
Headers: Authorization: Basic base64(consumerKey:consumerSecret)
→ returns access_token (valid ~3600s, refresh before expiry)
```

### Key endpoints
| Endpoint | What it does |
|---|---|
| `/mpesa/stkpush/v1/processrequest` | Initiates STK Push (user enters PIN on phone) |
| `/mpesa/stkpushquery/v1/query` | Check STK Push status |
| `/mpesa/accountbalance/v1/query` | Get M-Pesa balance |
| `/mpipa/b2c/v1/paymentrequest` | Send money from business to user's M-Pesa |
| Register C2B URL | Receive incoming payment webhooks |

### Example: Check balance
```javascript
const response = await fetch('https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    Initiator: 'your_api_username',
    SecurityCredential: 'encrypted_password',
    CommandID: 'AccountBalance',
    PartyA: '600000', // shortcode
    IdentifierType: '4',
    Remarks: 'balance check',
    QueueTimeOutURL: 'https://yourapp.com/timeout',
    ResultURL: 'https://yourapp.com/result'
  })
});
// Result arrives async via webhook at ResultURL
```

### Limitations
- Balance queries only work for **your own business account**, not arbitrary M-Pesa numbers
- Transaction history is not directly available via API — you get real-time callbacks instead
- STK Push requires user to physically enter their M-Pesa PIN on their phone

---

## 2. Equity Bank Developer API

### What you get
- Account balance
- Mini-statement (last N transactions)
- Full transaction history
- Internal transfers (account to account)
- Loan and savings account info
- Standing orders

### Setup steps
1. Register at developer.equitygroupholdings.com
2. Create a developer account (free sandbox access)
3. Create an app → get **Client ID** and **Client Secret**
4. Test in sandbox with mock accounts
5. For production: submit a formal application with your use case, get reviewed, sign partnership agreement

### Auth flow (OAuth 2.0)
```
Step 1: Redirect user to Equity login
GET https://developer.equitygroupholdings.com/oauth/authorize
  ?client_id=YOUR_CLIENT_ID
  &redirect_uri=https://yourapp.com/callback
  &response_type=code
  &scope=accounts transactions

Step 2: User logs in with their Equity credentials, approves access
→ Equity redirects to your callback with auth code

Step 3: Exchange code for tokens
POST https://developer.equitygroupholdings.com/oauth/token
Body: { grant_type: 'authorization_code', code: 'the_code', ... }
→ returns access_token + refresh_token
```

### Key endpoints
| Endpoint | What it does |
|---|---|
| `GET /accounts` | List user's accounts |
| `GET /accounts/{id}/balance` | Get account balance |
| `GET /accounts/{id}/transactions?from=&to=` | Transaction history |
| `POST /transfers/internal` | Transfer between own accounts |
| `GET /accounts/{id}/statements` | Download statement |

### Example: Get transaction history
```javascript
const response = await fetch('https://developer.equitygroupholdings.com/api/v1/accounts/12345678/transactions?from=2024-01-01&to=2024-01-31', {
  headers: {
    Authorization: `Bearer ${accessToken}`
  }
});
const { transactions } = await response.json();
// Each transaction: { id, date, description, debit, credit, balance }
```

### Limitations
- Production access requires formal partnership (can take weeks)
- User must have an Equity bank account
- Sandbox is read-only — real transactions only in production
- Must handle token refresh (access tokens expire in ~1 hour)

---

## 3. KCB BUNI API

### What you get
- Account balance
- Mini-statement
- Account details (name, type, currency)
- Fund transfers

### Setup steps
1. Register at buni.kcbgroup.com
2. Create an app → get **API Key** and **Secret**
3. Sandbox available for testing
4. Production requires onboarding/KYC

### Auth flow
```
POST https://buni.kcbgroup.com/oauth/token
Headers: Authorization: Basic base64(apiKey:apiSecret)
Body: { grant_type: 'client_credentials' }
→ returns access_token
```

### Example: Get balance
```javascript
const response = await fetch('https://buni.kcbgroup.com/api/v1/accounts/12345678/balance', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  }
});
const { balance, currency } = await response.json();
```

### Limitations
- Similar to Equity — requires partnership for production
- No direct transaction history via public API (mini-statement only, last 5-10 transactions)
- Client credentials auth only — no user-facing OAuth flow (not ideal for user-controlled access)

---

## 4. How It Would Fit Into UniFlow

### Architecture
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  React App  │────▶│  UniFlow Backend  │────▶│  Bank/M-Pesa API │
│  (frontend) │◀────│  (Node/Express)   │◀────│  (external)      │
└─────────────┘     └──────────────────┘     └─────────────────┘
                            │
                     ┌──────▼──────┐
                     │   SQLite DB  │
                     │ (cached data)│
                     └─────────────┘
```

### New backend routes
```
POST   /api/bank/connect          → initiate OAuth / link account
GET    /api/bank/callback          → handle OAuth callback, store tokens
GET    /api/bank/accounts          → list linked accounts
GET    /api/bank/accounts/:id/balance → current balance
GET    /api/bank/accounts/:id/transactions → synced transactions
POST   /api/bank/sync              → manually trigger sync
DELETE /api/bank/accounts/:id      → unlink account
GET    /api/bank/status            → connection health check
```

### New DB tables
```sql
-- store linked bank accounts
CREATE TABLE linked_accounts (
  id INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,           -- 'equity', 'kcb', 'mpesa'
  account_number TEXT NOT NULL,
  account_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry DATETIME,
  last_synced DATETIME,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- store synced transactions
CREATE TABLE synced_transactions (
  id INTEGER PRIMARY KEY,
  linked_account_id INTEGER NOT NULL,
  external_id TEXT UNIQUE,          -- transaction ID from bank
  date DATE NOT NULL,
  description TEXT,
  amount DECIMAL(10,2),
  type TEXT,                        -- 'debit' or 'credit'
  balance_after DECIMAL(10,2),
  FOREIGN KEY (linked_account_id) REFERENCES linked_accounts(id)
);
```

### Sync flow
```
1. User clicks "Connect Bank Account"
2. Backend generates OAuth URL, redirects user to bank login
3. User logs in, approves access
4. Bank redirects back with auth code
5. Backend exchanges code for access_token + refresh_token
6. Backend stores tokens in linked_accounts table
7. Backend fetches transactions, stores in synced_transactions
8. Scheduled job (cron) refreshes tokens before expiry and re-syncs
```

### Frontend changes
- New `BankConnections.js` page showing linked accounts with status
- "Connect Bank" / "Connect M-Pesa" buttons
- Sync indicator (last synced X minutes ago)
- Synced transactions appear alongside manual transactions with a bank icon
- Filter toggle: Manual only | Bank only | All

---

## 5. Practical Considerations for Students

| Concern | Notes |
|---|---|
| **Cost** | All APIs are free to use; Safaricom charges per STK Push (~KES 1-5), others are free for reads |
| **Compliance** | Equity/KCB require you to be a registered business for production access; Safaricom requires a Paybill |
| **Sandbox-first** | You can build and demo the entire integration in sandbox mode without any approvals |
| **Security** | Never store raw bank credentials; OAuth tokens are encrypted at rest; use HTTPS everywhere |
| **Student angle** | A student demo with sandbox data is perfectly valid for a portfolio project — no production API needed |

---

## 6. Recommended Path

1. **Start with Daraja sandbox** — fastest to set up, most relevant for Kenyan students (everyone has M-Pesa)
2. **Add Equity sandbox** — best bank API, good documentation
3. **Build the sync infrastructure** once, plug in more providers later
4. **Demo with sandbox data** — no production approval needed for a student project
