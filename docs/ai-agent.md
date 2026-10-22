# AI Agent — acting on your ledger

The AI in UniFlow is not just a chatbot that gives advice. It can **read** your
ledger, **find** the transaction you mean, and **change** it — through a set of
narrow, audited tools.

Ask it things like:

- *"Change my KPLC transaction to Food & Dining"*
- *"Categorize everything pending"*
- *"Log a 500 shilling lunch on M-Pesa"*
- *"Move 2000 from M-Pesa to NCBA"*
- *"Delete that 50 bob Uber trip"* → you get asked to confirm first

---

## How it works

```
you type a message
        │
        ▼
  POST /api/finance/chat
        │
        ├─ financial snapshot injected into the prompt
        │  (balances, budget status, last 10 transactions with ids)
        │
        ▼
  the model may request tools  ──►  server executes the tool
        │                                   │
        │                                   ├─ non-destructive → runs now
        │                                   └─ destructive     → parked,
        │                                        you approve it
        ▼
  model gets the result back and writes its reply
        │
        ▼
  reply + activity chips + (optional) confirmation card
```

The model never touches the database directly. It can only reach your data
through the tools below, and every call is recorded in the audit trail.

### The tools

| Tool | What it does | Needs approval? |
|------|--------------|-----------------|
| `list_transactions` | Searches your ledger by description, category, type or account | No |
| `list_pending_transactions` | Lists SMS you have not categorized yet | No |
| `update_transaction` | Edits amount, description, category, type, account or date | No |
| `create_transaction` | Logs a new income or expense | No |
| `record_transfer` | Moves money between your own accounts | No |
| `categorize_pending_transaction` | Categorizes one pending SMS and logs it | No |
| `categorize_pending_transactions` | Categorizes and logs every pending SMS | No |
| `delete_transaction` | Deletes a transaction | **Yes** |

---

## Safety rules

**Destructive actions wait for you.** When the model wants to delete something,
the action is parked as a *pending action* and the chat shows a card with
**Yes, do it** / **No, cancel**. Nothing is deleted until you approve it.

**Edits cannot silently overdraw an account.** An edit is rejected if it would
push an account further into the red:

```
409 { "error": "Not enough tracked balance in M-Pesa",
      "code": "INSUFFICIENT_FUNDS",
      "available": 2100, "requested": 2550, "account": "MPESA" }
```

An edit that does *not* move money — say, fixing a typo in a description — is
never blocked by a shortfall that was already there. `force: true` overrides the
check if you know the money is really there.

**Everything is written down.** Each tool call is stored as an `AiAction` row:
what was called, with which arguments, what happened, and whether you had to
approve it. See the **AI Activity** page in the app (`/ai-activity`).

**Failures leave your ledger alone.** If the AI cannot be reached, the chat
answers with a plain message and reports that *nothing was changed*.

> **Heads up:** the app has no authentication yet — `userId` comes from the
> request body. Every query is still scoped to that user, but before exposing
> this publicly you should put real authentication in front of it.

---

## Auto-categorizing pending SMS

Paste a batch of M-Pesa SMS on the **Pending** screen and press
**✨ Auto-categorize all**.

1. Keyword rules (`mpesaParser.js`) place the obvious ones — KPLC → *Utilities &
   Bills*, Naivas → *Groceries & Shopping*, Uber → *Transport*.
2. Whatever the rules cannot place goes to the AI in one batched call.
3. Each transaction is logged onto the ledger and the pending row is marked
   categorized.

Cash withdrawals and agent deposits are detected as transfers between your own
accounts and recorded as such — they never count as spending.

If no AI key is configured, the rules still run and anything ambiguous simply
lands in **Other** instead of failing.

---

## API

### `PATCH /api/finance/transactions/:id`

Edit a transaction. Registered for both `PATCH` and `PUT`.

```jsonc
// request
{
  "userId": "demo-user",
  "amount": 420,
  "description": "KPLC prepaid token",
  "category": "Utilities & Bills",
  "type": "expense",          // income | expense | transfer
  "provider": "MPESA",        // MPESA | NCBA | IM | CASH
  "toProvider": null,         // destination, transfers only
  "timestamp": "2026-10-22T08:00:00.000Z",
  "force": false              // true skips the funds check
}

// response
{
  "transaction": { "id": 2, "amount": 420, "category": "Utilities & Bills", ... },
  "changes": {
    "amount":   { "from": 350, "to": 420 },
    "category": { "from": "Other",  "to": "Utilities & Bills" }
  }
}
```

Editable fields: `amount`, `description`, `category`, `type`, `provider`,
`toProvider`, `timestamp`. Anything else is rejected with `INVALID_FIELD`.

### `POST /api/finance/pending-transactions/auto-categorize`

```jsonc
// request
{ "userId": "demo-user", "limit": 25 }

// response
{
  "categorized": 4,
  "skipped": 0,
  "aiUsed": true,
  "items": [
    { "pendingId": 7, "transactionId": 12, "category": "Utilities & Bills",
      "source": "rules", "description": "Paid to KPLC PREPAID", "amount": 350 }
  ],
  "message": "Categorized 4 transactions"
}
```

`source` is `rules`, `ai` or `transfer`.

### `POST /api/finance/chat`

Same as before, but the response now carries what the AI actually did.

```jsonc
{
  "reply": "Done — I moved it to Food & Dining.",
  "activity": [
    { "tool": "list_transactions",   "ok": true, "summary": "Listed 1 transaction" },
    { "tool": "update_transaction",  "ok": true, "summary": "Updated transaction #2 (category) — now \"KPLC prepaid token\", KES 350, Utilities & Bills" }
  ],
  "pendingActions": [
    { "id": 3, "tool": "delete_transaction", "summary": "Delete transaction #1 \"Sent to SAMUEL MALOI\" (KES 50, M-Pesa, Other)" }
  ]
}
```

`activity` is also stored with the chat message, so it survives a page reload.

### `POST /api/finance/ai/actions/:id/confirm` · `POST /api/finance/ai/actions/:id/cancel`

Run or discard a parked destructive action. Confirming twice returns
`ALREADY_RESOLVED`.

### `GET /api/finance/ai/actions`

The audit trail, newest first.

```jsonc
[
  { "id": 3, "tool": "delete_transaction", "status": "pending",
    "requiresConfirmation": true, "summary": "Delete transaction #1 ..." },
  { "id": 2, "tool": "update_transaction", "status": "executed",
    "requiresConfirmation": false, "summary": "Updated transaction #2 (category) ..." }
]
```

Status is one of `pending`, `executed`, `cancelled`, `failed`.

---

## Providers

Tool calling works with both provider families:

- **Groq / OpenAI-compatible** — the OpenAI `tools` schema is sent as-is.
- **Google Gemini** — the schema is converted to Gemini's
  `functionDeclarations` and the calls are read back from the response parts.

Set the provider in `backend/.env`:

```
GEMMA_PROVIDER=groq
GEMMA_API_KEY=your-groq-key
GEMMA_MODEL=llama-3.3-70b-versatile
```

---

## Files

| File | Role |
|------|------|
| `backend/services/aiTools.js` | Tool definitions + executor + confirmation flow |
| `backend/services/transactionService.js` | Validated edits, balance projection |
| `backend/services/categorizationService.js` | Rules first, AI for the ambiguous |
| `backend/services/aiService.js` | Provider adapters, the tool loop |
| `backend/models/AiAction.js` | Audit trail |
| `backend/tests/aiTools.test.js` | Tool + confirmation tests (no API key needed) |
