# Transfers — moving money between Bank, M-Pesa and Cash

UniFlow treats your money as living in **accounts**, not just in a transaction
list. A transfer moves money from one of your accounts to another, so it has to
move *balances* without ever looking like spending.

---

## 1. Accounts

| Provider | Label | Group | Notes |
|---|---|---|---|
| `MPESA` | M-Pesa | mpesa | Safaricom wallet |
| `NCBA` | NCBA | bank | Bank account |
| `IM` | I&M | bank | Bank account |
| `CASH` | Cash | cash | Physical money in your pocket |

The Dashboard groups `NCBA` + `IM` into a single **Bank** figure, but the
transfer screen keeps them apart so you can move money between your own bank
accounts too.

The account list lives in `backend/services/accountService.js` — add an entry
there to support another provider (the `Transaction.provider` and
`Transaction.toProvider` enums must be updated to match).

---

## 2. Data model

A transfer is a normal `Transaction` row with `type = 'transfer'`:

```js
{
  type: 'transfer',
  provider: 'MPESA',      // source account
  toProvider: 'NCBA',     // destination account
  amount: 1000,
  category: 'Transfer',
  description: 'School fees'
}
```

`toProvider` is `NULL` for income/expense rows. The column is added
automatically by `backend/services/migrations.js` on startup, so existing
databases keep working (the migration is idempotent — it checks
`PRAGMA table_info` before running `ALTER TABLE`).

---

## 3. Balance maths

Per account:

```
balance = income − expenses + transfersIn − transfersOut
```

* **Income** adds to the account it was received into.
* **Expenses** are taken off the account they were paid from.
* **Transfers** leave one account and land in another — the *total* balance
  across all accounts never changes.

Because a transfer is neither income nor an expense, it is automatically
excluded from:

* the weekly budget (`checkWeeklySpend`)
* the spending-leak / micro-spending analysis
* the category and income charts
* the auto-save rule (which only fires on income)

This is the whole point: withdrawing KES 1,000 from M-Pesa to cash must not
look like you spent KES 1,000.

---

## 4. API

### `GET /api/finance/accounts`

```json
{
  "accounts": [
    { "provider": "MPESA", "label": "M-Pesa", "group": "mpesa", "icon": "📱",
      "balance": 2100, "income": 2500, "expenses": 400,
      "transferredIn": 0, "transferredOut": 1000 }
  ],
  "totals": { "balance": 2100, "income": 2500, "expenses": 400,
              "mpesa": 2100, "bank": 0, "cash": 0 }
}
```

### `POST /api/finance/transfers`

```json
{ "from": "MPESA", "to": "NCBA", "amount": 1000, "description": "School fees" }
```

| Status | Meaning |
|---|---|
| `201` | Transfer recorded |
| `400` | Invalid account, same source and destination, or bad amount |
| `409` | `INSUFFICIENT_FUNDS` — the source account's tracked balance is too low |

The 409 response includes `available` and `requested` so the UI can offer a
"record anyway" override (send `force: true` to bypass the check — useful when
you have money in an account you haven't logged yet).

### `GET /api/finance/transfers`

Most recent transfers first (same shape as a transaction row).

### `POST /api/finance/transactions`

Still accepts transfers, using `provider` as the source and `toProvider` as the
destination:

```json
{ "type": "transfer", "provider": "MPESA", "toProvider": "CASH",
  "amount": 500, "description": "ATM cash" }
```

---

## 5. M-Pesa SMS → transfer

`backend/utils/mpesaParser.js` recognises two M-Pesa messages that are really
account-to-account movements:

| SMS | Detected as |
|---|---|
| `You have withdrawn KSh 1,000 from M-PESA at ATM KENYATOWN …` | M-Pesa → Cash |
| `Cash Deposit Confirmed. KSh 500.00 deposited to M-PESA Account …` | Cash → M-Pesa |

These are stored as **pending** transactions with `fromProvider` / `toProvider`
set. On the *Pending* screen they show the route (`M-Pesa → Cash`) and the
primary action becomes **Record Transfer** instead of *Categorize*, so the
money lands in the right accounts.

The `transactionReference` is unique, so it doubles as the duplicate guard.
Agent messages are parsed for their trailing `Ref XXXXXXXX` code rather than
the agent name (`M-PESA KENYATOWN …`) — otherwise two visits to the same agent
would look like the same transaction and the second would be rejected.

Everything else stays an expense or income, exactly as before.

---

## 6. Frontend

| File | Role |
|---|---|
| `frontend/src/pages/Transfers.js` | Transfer form, live balances, before/after preview, history |
| `frontend/src/pages/Transactions.js` | Ledger renders transfers as `M-Pesa → NCBA`; filters match either side |
| `frontend/src/pages/AddTransaction.js` | Income/expense only, with a shortcut to the transfer screen |
| `frontend/src/pages/Dashboard.js` | "Transfer money" card under the balance hero |
| `frontend/src/pages/PendingTransactions.js` | SMS cash movements can be recorded as transfers |
| `frontend/src/App.js` | `/transfer` route + sidebar entry |

---

## 7. Not a transfer

Sending money to **someone else** (a friend, a paybill, a school fees
account) is spending — the money leaves your accounts for good. Log those as
**expenses**, not transfers. A transfer only ever moves money between accounts
you own.
