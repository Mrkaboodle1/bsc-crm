# Big Star Books — Product & Build Plan
*An accounting "action system" for BigStar Circus — works like Xero, but built so Rhett can actually action it.*
Last updated: 25 June 2026

---

## 1. Product overview
Big Star Books turns the raw numbers (bank, Stripe, Square, Xero) into a **to-do list**. Every
bank transaction has a clear status, and the home screen always answers one question:
**"What do I need to do next?"**

- For **Rhett**: simple, plain-English, one action at a time. Never accountant jargon.
- For the **accountant**: a professional review portal — see everything, fix, note, lock periods.
- Long-term: this could become a real SaaS product for other small businesses.

Guiding rules: keep it simple; every screen has action buttons; never store bank passwords;
never fake a bank integration; human review before anything risky.

---

## 2. User journey

**Rhett (owner) — daily/weekly:**
1. Opens Big Star Books → **Action Dashboard**.
2. Sees "12 transactions need review", "3 receipts missing", "1 accountant question".
3. Works the review list: each transaction shows a **suggested category** → he taps **Approve**,
   or edits, splits, attaches a receipt, or marks personal/director loan.
4. Sends invoices, sees what's owed and what's due.
5. Anything he's unsure about → **Ask accountant** (one tap).

**Accountant — monthly/quarterly:**
1. Logs in to the **Accountant Portal** (their own secure login).
2. Reviews unreconciled items, fixes categories, leaves notes, answers Rhett's questions.
3. Runs reports (P&L, GST/BAS), marks items reviewed, then **locks the period**.

---

## 3. Action Dashboard (home screen layout)
Top row — big number tiles: **Cash balance · Profit this month · Expenses this month · GST estimate**.
Then an **"Action list"** (the heart of it), each line a one-tap job:
- 🔴 Bank transactions needing review (count → list)
- 🧾 Receipts missing
- 💬 Accountant questions waiting
- 📥 Unpaid invoices (chase money)
- 📤 Upcoming bills / tax due
- ⚠️ Urgent (overdue BAS, super, etc.)

No vague charts. Every tile is clickable and leads to an action.

---

## 4. Database structure (Supabase tables)
*(New tables — DDL pasted by Rhett when we start Stage 1.)*

- **bank_accounts** — id, tenant_id, name, bank ("CommBank"), bsb, acct_no_masked, opening_balance, feed_source.
- **bank_transactions** — id, tenant_id, bank_account_id, date, description, amount, direction,
  balance, source ("csv"/"feed"/"stripe"/"square"), **status** (see below), category_id,
  gst_treatment, matched_invoice_id, confidence, notes, receipt_url, is_personal, import_key (dedupe).
- **chart_of_accounts** — id, tenant_id, code, name, type (income/expense/asset/liability/equity), gst_default.
- **categorisation_rules** — id, tenant_id, match_text, category_id, gst_treatment (the AI/learned rules).
- **bs_invoices** + **bs_invoice_lines** — make & send invoices (number, contact, lines, GST, status, sent_at, paid_at, pdf_url).
- **receipts** — id, tenant_id, transaction_id, file_url, uploaded_by.
- **accountant_notes** — id, tenant_id, transaction_id (nullable), author_role, body, needs_rhett, resolved.
- **period_locks** — id, tenant_id, period_start, period_end, locked_by, locked_at.

**Transaction status flow:**
`imported → needs_review → suggested → matched → reconciled → accountant_reviewed → locked`

---

## 5. Reconciliation workflow (Xero-style)
Each bank transaction row shows: date · description · amount · bank account · **suggested category**
· GST treatment · possible matching invoice/payment · **confidence score**.

Action buttons per row: **Approve · Edit category · Split · Attach receipt · Ask accountant ·
Mark personal/director loan · Reconcile.**

**AI Reconciliation Assistant** (learns from Rhett's past choices):
- Suggests categories; detects recurring transactions; identifies Stripe payouts and separates
  fees from gross; flags unusual expenses; asks a simple question when unsure; explains in plain English.
- **Never auto-approves anything risky** — suggestions only, human taps Approve.

---

## 6. Accountant portal (secure, role-based)
Separate login. Role-based permissions:
- **Rhett** — owner/admin (everything).
- **Accountant** — review, correct, note, request info, run/export reports, mark reviewed, lock periods.
- **Bookkeeper/staff** — limited (categorise, attach receipts; no locking).

Accountant can: view all transactions, review unreconciled, make corrections, add notes, request
info from Rhett, view/export reports, view receipts, mark reviewed, lock finalised periods.

---

## 7. CommBank connection — the safe options (researched)
**The honest reality:** in Australia you cannot legally pull a bank's transactions by storing the
customer's NetBank login. The compliant ways are:

1. **Open Banking / CDR (Consumer Data Right)** — the bank shares data *with consent*, no password
   ever leaves the bank. We can't be directly accredited cheaply, so we use a **CDR-accredited
   provider** (e.g. **Basiq** — Australian, or Frollo/Adatree). Rhett consents inside CommBank's own
   screen; the provider streams transactions to Big Star Books. **This is the recommended live feed.**
   *(Provider has a small monthly cost; secure; what fintechs use.)*
2. **Bank feed aggregator** — same idea via a feed provider; similar cost/security.
3. **CSV / OFX import** — Rhett exports transactions from CommBank NetBank and uploads the file.
   **Zero cost, no credentials stored, works today.** Best for **Stage 1** and as a permanent fallback.

**Recommendation:** start with **CSV import now** (free, immediate), then add the **Basiq live feed**
once the core system is proven. Never store bank passwords either way.

---

## 8. BigStar chart of accounts
**Income:** Term class fees · Holiday workshops · Private lessons · Birthday parties · Incursions ·
Events · Mr Kaboodle Entertainment · Merchandise · Grants · Donations · Play On vouchers.

**Expenses:** Rent · Staff wages · Contractors · Insurance · Equipment · Costumes · Marketing ·
Software · Vehicle/travel · Training · Repairs · Merchant fees · Bank fees · Director loan · GST paid.

---

## 9. Reports (kept simple)
P&L · Balance Sheet · GST report · Cash flow · Income by category · Expenses by category ·
Unreconciled transactions · Accountant action list · BAS preparation report.

---

## 10. Development roadmap
**Stage 1 — Foundation:** dashboard shell + action list · database tables · user roles ·
CSV/OFX transaction import · transaction list with statuses.
**Stage 2 — Reconcile:** reconciliation workflow + action buttons · chart of accounts ·
AI category suggestions · CommBank live feed (Basiq) research → build.
**Stage 3 — Accountant:** accountant portal · reports · receipt upload · notes/comments/questions.
**Stage 4 — Compliance & automation:** GST/BAS support · Stripe + Square auto-import · automation
rules · period review & lock.

---

### Compliance notes (Australia)
- GST cash basis, quarterly BAS; super 12% (payday super from 1 Jul 2026).
- We **cannot** be a registered tax/BAS agent or auto-lodge — Big Star Books *prepares*; the
  accountant or Rhett lodges. Keep that line clear for compliance.
