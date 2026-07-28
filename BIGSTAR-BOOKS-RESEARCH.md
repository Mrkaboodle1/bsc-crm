# Big Star Books — Research & Build Findings

*An Australian small-business accounting module (Next.js + Supabase/Postgres) for Big Star Circus, Gold Coast. Goal: simpler than Xero, sellable/franchisable. Compiled June 2026.*

> **How to read this:** Every library carries a licence note and a security caveat. Anything flagged **[REVIEW BEFORE LIVE]** must go through a security/licence review before it touches the live financial system. This is research, not legal or tax advice — confirm the commercial model with a registered BAS/tax agent and a privacy lawyer before launch.

---

## Contents
1. Open-source building blocks
2. Australian bank feeds (CDR / Open Banking)
3. Australian accounting & tax compliance
4. AI / LLM features and guardrails
5. Account onboarding best practices
6. What makes it sellable / franchisable
7. Top recommendations / what to do next

---

## 1. Open-Source Building Blocks

Stack target: **Next.js + Node + Postgres (Supabase)**. Prefer MIT/Apache/BSD. Star counts approximate.

### 1.1 Double-entry ledger libraries

| Option | What it does | Licence | Lang | Maturity | Fit |
|---|---|---|---|---|---|
| **Medici** (`flash-oss/medici`) | Node double-entry ledger; books, debits=credits, void-and-reverse (never deletes) | **MIT** | TypeScript | ~350★, active (v7.2 Jul 2025) | **POOR — MongoDB-only.** Cannot use with Postgres without a rewrite. Use as a *design reference*, not a dependency. |
| **TigerBeetle** | Purpose-built financial transactions DB, native double-entry, very high throughput | **Apache-2.0** | Zig core; **Node** client | ~16k★, very active | **Overkill + separate server.** Runs outside Supabase; another DB to operate/back up. Skip for now; revisit only at huge volume. |
| **hledger / Beancount / Ledger** | Plaintext-accounting CLIs & file formats | hledger **GPL-3.0**; Beancount GPL-family; Ledger BSD-ish | Haskell / Python / C++ | mature | **Not embeddable engines.** Good for import-rule ideas and reconciliation cross-checks. **[REVIEW]** GPL copyleft — only ever shell out as a separate process; never link/bundle their code. |

**Recommended path — build double-entry natively in Postgres** (no dominant npm lib exists, and this keeps one source of truth in Supabase):
- `accounts` (numbered, typed chart of accounts: asset/liability/equity/income/expense)
- `journal_entries` (header) + `journal_lines` (postings); **every entry's lines must sum to zero**
- **Enforce the balancing rule at the DB level** (constraint/trigger), not just in Node, so no API path can write an unbalanced entry
- Append-only / immutable postings; corrections via **reversing entries** (borrow Medici's void discipline)
- Use `numeric`/`decimal` for money — **never floats**
- Lock down with **RLS** so a tenant can only read/write its own ledger
- One SQL transaction per journal entry
- Reference schemas: journalize.io double-entry schema; gist.github.com/NYKevin/9433376

### 1.2 Invoice PDF generation (keep pdf-lib)

| Library | Licence | Approach | Notes |
|---|---|---|---|
| **pdf-lib** (current) | **MIT** | Programmatic create + modify, pure JS | No native deps. **Keep as primary** — safest for a financial system. |
| **PDFKit** | **MIT** | Low-level drawing, pure JS | Mature; verbose API. |
| **@react-pdf/renderer** | **MIT** | PDFs from React components, pure JS | Best add-on if richer layouts needed; no Chromium. **Recommended over Puppeteer.** |
| **pdfmake** | **MIT** | Declarative JSON docs, pure JS | Good for tabular invoices. |
| **Puppeteer (HTML→PDF)** | Apache-2.0 | Headless Chromium render | **[REVIEW BEFORE LIVE]** — ships Chromium (heavy native dep, large attack surface, patch burden). Only if pixel-perfect HTML/CSS is essential; sandbox it. |

### 1.3 CSV / OFX / QIF bank-statement parsers

| Library | Format | Licence | Notes |
|---|---|---|---|
| **csv-parse** (node-csv) | CSV | **MIT** | Streaming; **recommended for CSV**. |
| **PapaParse** | CSV | **MIT** | ~12k★, robust to malformed input; great alternative. |
| **ofx-js**, **ofx-data-extractor** (TS), **node-ofx** | OFX/QFX | check repo (MIT-family) | **[REVIEW]** Small single-maintainer packages — pin versions, read the code (they're small), guard against XML-entity expansion. |
| QIF parsers (various) | QIF | mixed | **[REVIEW]** Lightly maintained; vet each. |

**Security note:** treat every uploaded statement file as untrusted input (validate size/encoding, guard XML parsing). For AU banks **CSV is the most reliable path** — lean on csv-parse/PapaParse + your own per-bank mapping rules (hledger-style); treat OFX/QIF as nice-to-have. This matches the CommBank CSV import already built.

### 1.4 Open-source accounting apps — learn patterns, **do not copy code**

**Licensing reality: almost all mature OSS accounting apps are AGPL or source-available** — you generally cannot copy their code into a proprietary SaaS without triggering copyleft/network-use obligations. Read them; don't fork them.

| App | Licence | Stack | Learn from / caveat |
|---|---|---|---|
| **Firefly III** | **AGPL-3.0** | PHP/Laravel | Account types, transfers, **CSV data-importer rules**. **[REVIEW]** patterns only. |
| **Akaunting** | **BUSL-1.1** (→ GPL on change-date) | Laravel + Vue | Full chart of accounts, banking, invoicing. **[REVIEW — MOST RESTRICTIVE]** Business Source Licence = source-available with non-compete; not OSI open-source. Patterns only. |
| **Crater** | **AGPL-3.0** | Laravel + Vue | Clean invoice/estimate/payment model + PDF templating. **[REVIEW]** patterns only. |
| **InvoicePlane** | check repo (verify) | PHP/CodeIgniter | Lightweight quotes→invoices→payments flow. Verify licence before any reuse. |
| **Maybe** (`maybe-finance/maybe`) | **AGPL-3.0** | Rails | **ARCHIVED Jul 2025 — do not build on it.** Community fork "sure" continues it (still AGPL). UX reference only. |

**Reusable design ideas (safe to learn):** numbered/typed/hierarchical chart of accounts; reconciliation = import statement → rule-match against postings → matched/unmatched/suggested status; transfers as two-sided postings; corrections via reversing entries; immutable journal.

**[REVIEW BEFORE LIVE] for Section 1:** Akaunting (BUSL non-compete), any AGPL code (Firefly/Crater/Maybe), Puppeteer/Chromium, and every OFX/QIF npm parser.

---

## 2. Australian Bank Feeds — CDR / Open Banking

**Bottom line:** You almost certainly do **not** need CDR accreditation yourself. Use the **CDR Representative model** — contract with an accredited intermediary who acts as your "Principal," carries the accreditation and liability, and you go live in ~2 weeks. With true CDR, **you never see or store the customer's bank password**: the customer authenticates and consents on their own bank's site; data flows to you via the intermediary.

**Avoid screen-scraping.** It requires storing/replaying the customer's actual internet-banking credentials. The Australian Government announced (March 2025) its intent to **ban screen-scraping** as "fundamentally unsafe." Building on it is a dead end and a security liability.

### 2.1 CDR access models

| Model | Accreditation? | Audit? | Liability | Realistic for a small app? |
|---|---|---|---|---|
| Unrestricted ADR | Full ACCC | Yes (ASAE 3150 / SOC 2) | You | No — heavy, costly |
| Sponsored / Affiliate | Lighter | Self-assess + sponsor | The Affiliate | Possible later |
| **CDR Representative** | **No** | No (contractual controls) | **Principal (intermediary)** | **Yes — the path** |
| Trusted Adviser | No | No | Disclosing ADR | If you're a registered professional |
| CDR Insights | No | No | Disclosing ADR | Too limited (no raw transactions) |

The Representative model is now the dominant route (Frollo: 2/3+ of registered CDR entities). The **Principal carries the full legal liability** (penalties up to greater of $10M / 3× benefit / 10% turnover) — which is why they charge and impose contractual security obligations on you.

### 2.2 Providers

**Basiq (basiq.io)** — *recommended to prototype first.*
- 135+ AU institutions; transaction data + enrichment/categorisation. Used by PocketSmith.
- **Non-accredited access: Yes** (Principal / CDR Representative model).
- **Pricing (most transparent of the four):** Data ~**$0.50 per connected user/month** + platform fee; enrichment ~$0.25/user/mo; affordability reports from ~$3. Min 12-month contract.
- **Sandbox: Yes** — self-serve API key, build/test before talking to sales.

**Frollo (Volt CDR platform)**
- Enterprise Open Banking platform; strong enrichment, consent management. First to access CDR on launch day.
- **Non-accredited access: Yes** (Representative / white-label), but more **enterprise-leaning** — confirm small-app onboarding directly.
- **Pricing: not public** (quote-only). No public sandbox.

**Adatree (owned by Fat Zebra)** — broadest coverage.
- 114 sources, ~99.73% of AU household banking. First open-banking **Principal**; "CDR as a service."
- **Non-accredited access: Yes** — Representatives can go live in ~2 weeks; Adatree handles most ACCC/OAIC reporting.
- **Caveat:** onboarding still expects documented security controls (references ISO 27001 / SOC 2 Type 2 / ASAE 3150) — contractual, not zero-effort.
- **Pricing: not public** (premium positioning).

**Envestnet | Yodlee** — use CDR feed only.
- CDR-accredited intermediary **plus** 400–500+ non-CDR sources (incl. super) via **screen-scraping**.
- **Caveat:** its breadth advantage is screen-scraping — the practice slated to be banned. If used, **insist on the CDR path**; do not architect around scraped credentials.

### 2.3 Security message to keep front-and-centre
- **True CDR = no passwords.** Bank → accredited intermediary → you (Representative), scoped to exactly what the customer consented to, time-limited.
- **Screen-scraping = you/your provider hold the bank password** — high breach blast-radius, often breaches bank T&Cs, being banned.
- Under the Representative model the intermediary is liable, but **you still inherit contractual security obligations** (data handling, deletion, controls) — read those clauses. **[REVIEW BEFORE LIVE]**

---

## 3. Australian Accounting & Tax Compliance

*Sources: ato.gov.au, tpb.gov.au, oaic.gov.au, treasury.gov.au.*

### 3.1 ATO record-keeping
- **Keep most records 5 years** (from the later of preparation or transaction completion). **Longer** for CGT assets, disputes, extended periods of review.
- **What:** all income/expense and tax/super/registration records, plus elections/choices/calculations.
- **Format (design-critical):** electronic records OK; **must be in English**; **must not be alterable** / stored so they can't be changed or damaged (immutability + audit trail); must be able to **reconstruct/export** original data through system changes; true and clear.

### 3.2 GST & BAS
- **Register at $75,000** turnover ($150,000 NFP); taxi/ride-source register regardless. Register **within 21 days** of becoming aware turnover will exceed.
- **BAS frequency:** Monthly (turnover ≥ $20M or ATO-directed); **Quarterly (default for small business)**; Annually (voluntary registrants under threshold).
- **BAS covers:** GST, PAYG withholding, PAYG instalments, fuel tax credits/WET/LCT where applicable.

### 3.3 CRITICAL — software/AI cannot be a registered tax or BAS agent
Under the **Tax Agent Services Act 2009** (regulated by the **TPB**):
- Anyone providing a **tax agent service or BAS service for a fee or other reward** must be **registered**. **Software/AI cannot itself be registered** — only a human (or a company with enough registered supervising individuals).
- "Fee or reward" is broad (bundled fees, future business, commissions). A subscription SaaS cannot, *through the software*, provide BAS/tax agent services for that fee.
- A "BAS service" includes working out/advising on GST/PAYG/super obligations **and lodging or dealing with the ATO on the client's behalf**.
- **Penalties are real** — up to **$1.8M** obtained for unregistered preparation for a fee.

**Software IS allowed to:** be a tool the taxpayer uses to prepare and **self-lodge their own** BAS/returns/STP; calculate/populate/format/assist; lodge as an approved product *for the business acting for itself*.

**Software is NOT allowed to:** hold itself out as a registered agent; provide tax advice / a BAS service **for fee or reward** without a registered human standing behind it; lodge on behalf of a third-party client as an agent.

**Implication:** position Big Star Books as a **self-service tool** the owner uses for their own affairs. Frame AI output as **information/calculation**, not "tax advice," and recommend a registered agent. Any bookkeeping-as-a-service-for-others requires a **registered BAS/tax agent supervising**. **[REVIEW BEFORE LIVE — legal]**

### 3.4 Single Touch Payroll (STP Phase 2)
- Report payroll **each pay run, on or before payday**, through **STP-enabled software**.
- **You cannot self-lodge STP** via an unapproved channel. The product must be **on the ATO product register**, transmit via **SBR** using a **Software ID** the business registers to the ATO, routed through an **approved Sending Service Provider (SSP)**. To send STP itself, Big Star Books would need to be a registered STP product or integrate an existing SSP.
- **No/low-cost STP for micro employers (1–4 staff):** ATO maintains a randomised **no-cost/low-cost STP register** (low-cost generally < ~$10/month). Micro employers may also have a quarterly concession via a registered agent.

### 3.5 SuperStream
- Super must be paid **electronically with data+money in the SuperStream format** (linked by a PRN), via a **SuperStream-compliant channel** (compliant payroll/clearing house, fund portal, commercial clearing house). Software must route through compliant rails — it can't push super directly.
- **Major change:** the free **Small Business Superannuation Clearing House (SBSCH) closes permanently from 1 July 2026** (Payday Super reform). Users must migrate to an alternative — help them plan this cutover.

### 3.6 Super guarantee rate & Payday Super
- **SG rate = 12%** (reached 1 Jul 2025; remains **12% from 1 July 2026**).
- **Payday Super starts 1 July 2026** (legislation passed): super must be paid **on payday**, with contributions **received by the fund within 7 business days**. Replaces quarterly model. Payroll + super calc + super payment must be **coupled to each pay run** — a significant FY27 design requirement landing right at the 1 July 2026 boundary.

### 3.7 Privacy Act 1988 / Australian Privacy Principles
- Applies to "APP entities" — orgs with **turnover > $3M** (plus some regardless, e.g. those trading in personal info). Comply as best practice even below threshold; mandatory once over $3M.
- **Key APPs:** APP 1 (privacy policy), APP 3/5 (collect only what's necessary + notify), APP 6 (purpose limitation/consent), APP 8 (cross-border), **APP 11 security** (reasonable steps — **new APP 11.3 from 11 Dec 2024** expressly includes technical + organisational measures like encryption/access controls), APP 12/13 (access + correction).
- **Notifiable Data Breaches:** if a breach is likely to cause serious harm, notify affected individuals + OAIC; assess within **30 days**. Financial data is high-risk — keep a documented breach response plan.
- **2024 reforms (commenced 11 Dec 2024):** new **statutory tort for serious invasions of privacy**, **stronger OAIC enforcement** + tiered penalties, APP 11.3 security clarification. First tranche of a larger overhaul — more change coming (likely removal of the small-business exemption). **[REVIEW BEFORE LIVE — privacy lawyer]**

---

## 4. AI / LLM Features and Guardrails

### 4.1 Transaction auto-categorisation — 3-tier pipeline (rules → ML → LLM)
Incumbents (Xero "JAX", QuickBooks) learn from the business's own ledger history and improve over time. Recommended architecture, in order of trust:
1. **Deterministic rules first** — memorised payee→account maps, recurring txns, bank rules. Cheap, auditable, no hallucination. Should handle the bulk.
2. **ML classifier** on the tenant's own coding history → category **+ confidence score**.
3. **LLM only for the residual** — novel/ambiguous descriptions. The LLM **suggests; never silently commits.**

Typical outcome: ~80% automated, human confirms the rest.

### 4.2 Anomaly / duplicate / fraud detection (high value, low risk — flags, doesn't act)
- **Duplicate detection** on supplier + amount + date + reference (plus fuzzy matches).
- **Anomaly detection** — spikes, outliers, new/unusual vendors, frequency/policy breaches.
- **Severity + confidence scoring** routes each flag to the right reviewer; thresholds tunable per tenant.
- Dashboards + audit trails (exception rate, time-to-resolution, false positives).

### 4.3 Plain-English explanations (grounded, never free-generated)
- Let users ask plain-English questions; answer with citations to exact source rows.
- Use **RAG** to ground the model in verified internal data.
- **Critical:** LLMs struggle with calculations. **Compute every number in code (SQL/ledger), pass it to the LLM as a fact, and let the LLM only do the wording.** The model must never perform the arithmetic behind a dollar figure shown to a user.

### 4.4 Guardrails — non-negotiable
1. **Human-in-the-loop is the core control** — AI accelerates/suggests; a person reviews, approves, applies judgment (CPA.com 2025 AI in Accounting).
2. **Never auto-approve risky actions** — payments, payroll runs, BAS/tax lodgements always require explicit human confirmation. AI drafts; a human submits. (Also a platform rule: the user performs financial actions, not the agent.)
3. **Confidence thresholds + graduated autonomy** — auto-apply only above a high bar for low-risk coding; otherwise surface as a suggestion.
4. **Never let the LLM silently alter ledger entries** — the LLM proposes; the change is written through the normal validated, double-entry, audited code path, flagged "AI suggested," reversible, attributed.
5. **Immutable audit trail** — log who/what (human vs AI), when, prior value, confidence, source evidence.
6. **Hallucination on numbers is the headline danger** — mitigate with RAG grounding, compute-in-code, constrained/verifier prompting, and source citations.
7. **Responsible-AI pillars** — transparency, explainability; always show *why* a category/flag was suggested.

> Before publishing in-app compliance copy, verify current **CPA Australia / CA ANZ** AI guidance directly (positions update often).

---

## 5. Account Onboarding Best Practices

### 5.1 What the setup wizard collects

| Step | Collect | Notes |
|---|---|---|
| Entity identity | Business name, **ABN**, entity type | Validate live via ABR (below) — reject cancelled/mismatched ABNs. |
| GST status | Registered? effective date, frequency | Only report GST for periods after the registration date. |
| Financial year | Default **1 Jul – 30 Jun** | Hard-default; editable only for substituted periods. |
| Chart of accounts | Industry **template**, then adjust | CoA maps directly to the statements/reports the owner relies on. |
| Bank feed | Connect feed / import | Verify txns flow **and** imported balance matches real bank balance at import date. |
| Opening / conversion balances | Balances at conversion date | Unreconciled opening balances cause errors that persist for years. |
| Comparatives | Prior-year figures (optional) | Enables YoY reporting from day one. |
| Prior system migration | Which system; import unpaid AR/AP + CoA via CSV | Xero model: convert CoA via CSV → input balances → import open AR/AP → comparatives via journals. |

### 5.2 Use the free ABR / ABN Lookup API in the wizard
- **Free** access to the Australian Business Register; register once for an **authentication GUID** (required per call). SOAP or HTTP GET/POST; easy to call from a Next.js route / Supabase edge function.
- Methods: `SearchByABNv202001` (status, entity type, GST, business names), Search by Name (type-ahead), Search with Filters.
- **UX:** user types business name → Search by Name → pick entity → SearchByABN auto-fills ABN/entity type/GST. Removes typing and validates in one step.

### 5.3 Reduce drop-off
- **Let them start before it's perfect** — get into the product fast with a persistent "finish setup" checklist for the heavy items (opening balances, bank feed).
- **Sensible defaults** — AU FY, quarterly GST, industry CoA template all pre-selected.
- **Templates by industry**; offer one-by-one, CSV bulk, and "do later/get help" paths for balances.
- **Front-load validation** (ABN/GST at entry) to prevent downstream errors and cut support load.

---

## 6. What Makes It Sellable / Franchisable

### 6.1 Multi-tenancy in Postgres / Supabase

| Approach | How | Best for | Trade-off |
|---|---|---|---|
| **Shared tables + `tenant_id` + RLS** | One set of tables; RLS filters every query by tenant | Most SaaS, early stage | Strongest *if* RLS is correct — one policy bug leaks data, so test policies rigorously |
| Schema-per-tenant | Dedicated schema per tenant | Strict-isolation / premium clients | More mgmt; migrations run across all schemas |
| Database-per-tenant | Fully separate DBs | Highest-compliance enterprise | Most expensive/operationally heavy |

**Recommendation:** start with **shared tables + `tenant_id` + RLS** — RLS enforces isolation at the **database layer**, so even a buggy API path can't leak another tenant's financial rows. Use **RLS for baseline isolation AND application-layer checks for business rules**. Keep **schema-per-tenant as a premium isolation tier** for any franchisee demanding physical separation + per-tenant backups/audit.

### 6.2 Branding / white-label
- Build **tenant-level theming early** (logo, palette, custom domain, "powered by" toggle) — it's a billable upsell and the foundation of a franchise offering. Vendors commonly charge a separate branding licence / setup fee.

### 6.3 Licensing / pricing models
- **Per-org subscription** core: base access fee per tenant + optional per-user + add-ons + premium support. White-label accounting commonly **~$50–$200 per client/month** (+$100–$300/mo premium support).
- **White-label / franchise:** flat or tiered licence fee, **revenue-share** (provider often 30–40%), or hybrid (base licence + commission on premium usage). **Setup fees** typically 10–40% of first-year ARR.
- **Franchise model for BSC:** sell white-labelled per-org subscriptions to bookkeepers/franchisees; take base licence + revenue share; charge branding/setup per franchisee; reserve schema-per-tenant as the premium compliance tier.

---

## 7. Top Recommendations / What To Do Next

1. **Build the ledger natively in Postgres** — double-entry with balancing enforced at the **database** level, immutable append-only postings, `numeric` money, reversing-entry corrections, RLS per tenant. Skip Medici (Mongo-only) and TigerBeetle (separate server). Borrow Medici's void discipline + hledger's import-rule design.
2. **Go CDR Representative for bank feeds — prototype on Basiq first** (only transparent pricing ~$0.50/user/mo, self-serve sandbox, proven PFM track record). Get Adatree (broadest coverage) and Frollo quotes as comparisons. **Never store bank passwords; reject screen-scraping** (being banned).
3. **Respect the hard legal line:** Big Star Books is a **self-service tool**, not a registered agent. It can prepare/calculate and let the owner **self-lodge their own** BAS/STP, but must not provide tax/BAS services *for a fee* without a registered human agent. STP and super **must** route through ATO-approved rails (Software ID + SSP) and SuperStream — integrate, don't reinvent.
4. **Design now for the 1 July 2026 events:** SG stays 12%; **Payday Super** (super on payday, 7-business-day fund receipt); **free SBSCH closes** — give users a migration path. Bake in **5-year immutable, English, exportable record-keeping** and a **Privacy Act/APP** posture (security, 30-day breach assessment, access/correction, privacy policy; note the Dec 2024 reforms).
5. **Ship AI as suggest-not-act:** lead with anomaly/duplicate detection and plain-English explanations (high value, low risk). Make categorisation a **rules → ML → LLM** pipeline. **Compute every number in code**; the LLM only does wording. **Never** auto-approve payments/payroll/lodgements; every AI change is a reviewable, attributed, reversible proposal through the audited code path.

**Bonus (onboarding + sellability):** use the **free ABR ABN Lookup** for a one-click identity step; default AU FY, quarterly GST, and an industry CoA template; let users start before opening balances are perfect. Build on **`tenant_id` + Supabase RLS** from day one with tenant theming early, so the franchise/white-label model is available when you want it.

### Items flagged [REVIEW BEFORE LIVE]
- Akaunting (BUSL non-compete); any AGPL code from Firefly/Crater/Maybe (patterns only, no code reuse)
- Puppeteer/Chromium (native dep, attack surface) if adopted for PDFs
- Every OFX/QIF npm parser (small, single-maintainer, untrusted-file input)
- CDR intermediary contracts (you inherit contractual security obligations)
- The commercial model vs TASA "services for a fee" line — confirm with a registered BAS/tax agent
- Privacy Act/APP compliance — confirm with a privacy lawyer

*This document is general research, not legal, tax, or financial advice.*
