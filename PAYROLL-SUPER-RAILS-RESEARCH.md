# Payroll & Super Rails Research — Big Star Circus Pty Ltd

**Prepared:** 1 July 2026
**For:** Big Star Circus Pty Ltd (Gold Coast circus school) — micro employer, ~5 staff now, wants headroom to ~10. Pays coaches (some contractors paid mainly for labour, still owed super), plus the director.
**Goal:** Cheapest COMPLIANT way to pay employee super and lodge STP under **Payday Super** (from 1 July 2026), replacing BOTH the closing ATO Small Business Superannuation Clearing House (SBSCH) AND Xero Payroll.

> **Pricing caveat:** All prices below are as advertised at time of research (mid-2026) and change often. Treat every dollar figure as "check before you commit." Anything I'm unsure about is flagged inline.

---

## 0. The deadline / what changed

- **SBSCH closes permanently at 11:59pm AEST on 30 June 2026.** New registrations already closed 1 Oct 2025. You must download your SBSCH transaction history before 1 July 2026 — after that it's gone.
- **Payday Super starts 1 July 2026.** Super must be paid at (roughly) the same time as wages — the contribution has to reach the employee's fund within **7 business days** of payday, not quarterly.
- The SBSCH was built for the old quarterly model and can't support payday frequency — that's why it's being retired.
- The last old-rules quarter (ending 30 Jun 2026) SG is still due **28 July 2026** on the old timing.

Sources: ATO SBSCH transition page (https://www.ato.gov.au/businesses-and-organisations/super-for-employers/payday-super/payday-super-resources/how-to-transition-from-the-small-business-superannuation-clearing-house), NSW Small Business Commissioner (https://www.smallbusiness.nsw.gov.au/news-podcasts/news/closure-of-the-small-business-superannuation-clearing-house-ahead-of-payday-super), Xero SBSCH closure guide (https://www.xero.com/au/guides/sbsch-closure/).

**One thing to note for BSC:** you pay super for some *contractors*. Under super law, contractors engaged "wholly or principally for their labour" ARE treated as employees for SG purposes, so paying them super is correct — but that also means you must report/pay them the same compliant way as regular staff. Any solution below handles that; just make sure each such contractor is set up in payroll as a super-eligible worker.

---

## 1. Standalone super clearing houses (SuperStream-compliant)

### 1a. FREE clearing houses from major super funds (when they are your default fund)

This is the big cost-saver. If you nominate one of these industry funds as your **default fund**, their clearing house is **free**, and you can still pay contributions to employees who are in *other* funds through the same single payment. This is the closest like-for-like replacement for the free SBSCH.

| Fund | Clearing house | Cost | Pays to other funds too? | Notes |
|---|---|---|---|---|
| **Australian Retirement Trust (ART)** | ART Clearing House (runs on **Beam Connect**, ART's own supertech via subsidiary Precision Administration Services) | **Free** when ART is your default fund | Yes | SuperStream-compliant; being positioned squarely for Payday Super. Because it IS Beam under the hood, it's arguably the most "payday-ready" of the free options. |
| **Hostplus** | **QuickSuper** | **Free** for all registered Hostplus employers | Yes | Long-standing, widely used; free even for non-Hostplus members' contributions. |
| **AustralianSuper** | New **Employer Portal** (replacing their QuickSuper instance through 2026) | **Free** to registered AustralianSuper employers | Yes | Explicitly "built with Payday Super in mind," MFA-secured. Migration from old QuickSuper is staggered through 2026. |

- "QuickSuper" is a Westpac-built platform that many funds (AustralianSuper, NGS, CSC, etc.) license and offer to their employers — so "QuickSuper" isn't one product, it's a white-label used by several funds, usually free to that fund's registered employers.
- **How you pay:** you register as an employer with the fund, log into their portal, upload/enter each employee's pay + super amounts (or a file), and pay one lump sum by EFT/direct debit/BPAY. The clearing house splits it and routes each contribution via SuperStream to the correct fund. Payday Super just means you do this every payday instead of quarterly.
- **Catch for BSC:** these are *portals*, not payroll. They do NOT lodge STP. You still need STP software (Section 2) for the wage-reporting side. A free fund clearing house + a cheap/free STP tool is the classic low-cost combo.

Sources: ART clearing house (https://www.australianretirementtrust.com.au/employers/pay-super-online/clearing-house), Hostplus QuickSuper (https://hostplus.com.au/employers/how-to-make-payments/register-for-quicksuper), AustralianSuper Employer Portal (https://www.australiansuper.com/employers/why-register-with-us/employer-portal and https://www.australiansuper.com/employers/employers-articles/2026/03/introducing-the-new-employer-portal).

### 1b. Commercial / standalone clearing houses

| Provider | Cost | Max employees | Payday-ready | How you pay / notes |
|---|---|---|---|---|
| **Beam** (owned by ART/Precision) | No standalone consumer price — Beam is embedded *inside* payroll products (Reckon, QuickBooks, Payroller, Employment Hero, Microkeeper, etc.). Fees, if any, are set by the host payroll app. | n/a | Yes — Beam is being re-plumbed for SuperStream v3 / Member Verification Request (MVR) | Serves 100,000+ employers. You rarely "buy Beam" directly; you get it bundled. Some payroll apps pass through a per-transaction fee. |
| **SuperChoice** | Enterprise/wholesale pricing (not a retail sign-up). | n/a | Yes | A gateway/clearing house *platform* that powers other brands (incl. ClickSuper). Offers white-label + API. More a B2B rail than a shop-front for a 5-person business. |
| **ClickSuper** | Clearing house + STP gateway; partnered with SuperChoice; markets "no extra cost" reporting+payments to its users. Exact retail pricing unclear — **verify directly.** | n/a | Yes | Also offers STP. Aimed more at bookkeepers/software than tiny direct employers. |
| **"The Superannuation Clearing House" / QuickSuper (Westpac)** | Commercial QuickSuper (outside a free-fund arrangement) is typically a paid subscription. **Pricing unconfirmed — verify.** | n/a | Should be | Same platform as the free-fund versions, but paid when not tied to a default-fund deal. Little reason to pay for this when free-fund versions exist. |

Sources: Beam (https://beamconnect.com.au/), SuperChoice clearing house (https://www.superchoiceservices.com/solutions/clearinghouse/), ClickSuper (https://clicksuper.com.au/single-touch-payroll-stp/), ClockOn's list of Australian clearing houses (https://www.clockon.com.au/blog/list-of-super-clearing-houses-in-australia).

**Takeaway for Section 1:** For BSC, a **free super-fund clearing house (ART, Hostplus, or AustralianSuper)** beats every commercial option on price and is fully SuperStream/Payday-Super compliant. The only decision is which fund to make your default.

---

## 2. Low-cost STP + super payroll software (≤10 employees)

All of these are ATO-approved STP Digital Service Providers (that's what "STP-enabled / ATO-whitelisted" means). The differences are price and whether they *also* push the SuperStream super payment for you.

| Product | Price (≤10 emps) | ATO-approved STP DSP? | Does SuperStream super payment? | Payday-ready | Notes |
|---|---|---|---|---|---|
| **e-PayDay FREEPAY / eCashbooks** | **Free forever for ≤3 employees** (no card, no time limit). Paid "e-PayDay Go" above that. | Yes (whitelisted since 2017 — one of the first STP lodgers) | Yes — integrates SuperChoice clearing house; markets "Payday Super Ready" | Yes | Genuinely free at BSC's *current* size but the free tier caps at 3, so you'd outgrow it before ~10. |
| **Payroller** | ~$3.99/emp/mo (annual) or $5.50/mo (monthly), **min ~$15.96–$22/mo**. Free only for single-person app payroll. | Yes | Yes — via **Beam** (fee applies per super run) | Yes ("actively prepared for Payday Super") | Cheap, mobile-first, Beam built in so it's a genuine all-in-one. Super fees are extra. |
| **Reckon Payroll (App/Single Touch)** | From ~$16/mo for full payroll; entry "Single Touch" tiers cheaper (intro discounts ~$0.99/mo). | Yes | Yes — **Beam SuperStream** built in; multi-fund batch by EFT/BPAY/direct debit | Yes ("Payday Super ready for 1 July 2026") | Solid all-in-one; well suited to a business at BSC's size scaling to 10. |
| **Single Touch (single-touch.com.au)** | **From 10¢/employee/pay period**, pay-as-you-go, no lock-in. | Yes ("ATO-whitelisted STP gateway") | Separate **"Payday Super" SuperStream platform** offered alongside STP | Yes | Cheapest pure-STP by far. **Also offers a free developer API** — see Section 3. |
| **seSQue** | Free for 1 employee; from ~$1.65/emp/mo. | Yes | Check — primarily STP-focused | Should be | Very cheap; verify super-payment coverage. |
| **KeyPay / Employment Hero Payroll** | Payroll-only ~$4–6/emp/mo, **no base fee** (KeyPay historically $4/emp). Full Employment Hero platform ~$20/emp with ~$200/mo minimum. | Yes | Yes (Beam) | Yes | Strong award interpretation (good for hospitality/coaching rosters). The cheap "KeyPay" payroll-only tier is the one to price; avoid the $200-min full platform. |
| **QuickBooks Payroll** | Payroll add-on ~$6/emp on a plan from ~$33/mo. | Yes (payroll powered by Employment Hero) | Yes (Beam) | Yes | Only worth it if you also want QuickBooks accounting — otherwise you're paying for the ledger too. |
| **MYOB** | From ~$12/mo for ≤4 staff. | Yes | Yes | Yes | Fine if you were already an MYOB shop; pricier per-head than the leaders as you grow. |
| **ClockOn** | **Free starter package up to 20 employees.** | Yes | Yes | Yes | Worth a look — free tier covers BSC's full 10-headcount ambition. Verify super-payment inclusion and any hidden limits. |

**Genuinely cheapest fully-compliant at BSC's size (~5, heading to 10):**
- If you want **all-in-one (STP + super in one tool):** **Reckon Payroll** or **Payroller** (both ~$16–22/mo range with Beam super built in) — or investigate **ClockOn's free ≤20 tier** which could be $0.
- If you're happy to **split STP and super:** **Single Touch at 10¢/emp/pay** for STP + a **free super-fund clearing house** for super is about as cheap as it legally gets (a few dollars a month total).

Sources: ATO no-cost/low-cost STP register (https://softwaredevelopers.ato.gov.au/no-cost-and-low-cost-solutions-single-touch-payroll), FREEPAY/e-PayDay (https://www.freepay.com.au/ and https://www.e-payday.com.au/), Payroller (https://payroller.com.au/), Reckon (https://www.reckon.com/au/single-touch-payroll-software/), Single Touch (https://singletouch.com.au/), KeyPay pricing (https://www.keypay.com.au/pricing), ClockOn (https://www.clockon.com.au/features/stp-software-packages).

---

## 3. API / integration angle — can "Big Star Books" (Next.js + Supabase) be the front-end?

**Yes, realistically — via a Sending Service Provider (SSP) / gateway API, NOT by building the compliance yourself.** This is the pragmatic path.

The idea: your CRM stays the front-end (where you enter pay runs, hold employee data, hit "Pay"), and a compliant provider does the regulated STP lodge + SuperStream payment behind the scenes via their API. That's exactly what an **SSP** (for STP) and a **clearing-house gateway** (for super) are for.

| Provider | Developer API / partner access? | Realistically integratable by a small custom app? |
|---|---|---|
| **Single Touch (single-touch.com.au)** | **Yes — "Portal/API" product with free API + published developer docs for STP.** Also has a separate Payday-Super SuperStream platform. | **Best fit.** Explicitly targets developers who need to add STP to their own platform, pay-as-you-go, no lock-in. This is the most realistic API partner for a solo-built CRM. |
| **SuperChoice** | **Yes — feature-rich API components + white-label; launches APIs specifically for payroll/onboarding providers to adopt MVR/SuperStream v3.** | Yes for super — but it's wholesale/B2B; expect a commercial onboarding process, not self-serve. Good for the super leg. |
| **ClickSuper** | Yes — STP gateway + clearing house, SuperChoice-backed. | Possible; more bookkeeper/software-oriented. Verify developer onboarding terms. |
| **Beam** | API exists (Beam-Connect developer portal on Apigee), but Beam is normally consumed *through* a host payroll app, not integrated directly by tiny third parties. | Harder to get direct partner access as a micro developer; usually reached via a payroll platform that already embeds it. |
| **Payroller / Reckon / KeyPay / QuickBooks / MYOB** | These are finished apps, not integration rails. Some have APIs to read/write payroll data, but they're the front-end, not a behind-the-scenes lodging service. | Effectively **closed** for the "CRM is the front-end" model — you'd be bolting your CRM onto their UI, not the reverse. |

**Bottom line for the integration dream:** It's genuinely doable to have Big Star Books call **Single Touch's API for the STP lodge** and a **clearing-house gateway (SuperChoice/ClickSuper, or Single Touch's Payday-Super platform) for the SuperStream payment**, so the CRM is the cockpit and the provider carries the compliance. This keeps BSC *out* of the ATO DSP program (see Section 4) because the provider is the registered DSP/SSP — you're their customer, not a DSP yourself. That's the smart architecture. It is a **real integration project** (weeks of dev + provider onboarding + testing), but it is not the multi-year regulated undertaking of Section 4.

Sources: Single Touch developer/API (https://singletouch.com.au/), SuperChoice DSP integration (https://www.superchoiceservices.com/who/digital-service-providers/), ATO guide for DSPs using an SSP (https://softwaredevelopers.ato.gov.au/guide-dsps-using-ssp), Beam-Connect API docs (https://precisionadmin-beamconnect.apigee.io/).

---

## 4. What it takes for a self-built app to become compliant ITSELF (be honest: this is big)

If Big Star Books wanted to lodge STP and push SuperStream **directly** (no third-party rail), it would have to become a registered **ATO Digital Service Provider (DSP)** and separately get **SuperStream messaging** capability. Realistic view:

### STP side — ATO DSP program + Operational Framework
- **Whitelisting:** You must register with the ATO **Digital Partnership Office (DPO)**, then build to and pass conformance testing against **SBR (Standard Business Reporting)** using the **SBR ebMS3** messaging protocol. All STP reports go over SBR ebMS3.
- **Operational (Security) Framework (OSF):** mandatory controls — **multi-factor authentication, audit logging of all access/transactions, entity validation, encryption, personnel checks**, and **machine-to-machine (M2M) / device credentials** for cloud software authentication & authorisation (CAA).
- **Independent security assessment:** you must certify against **ISO/IEC 27001 or IRAP** (Australian govt security assessor program). For a genuine cloud multi-tenant service this is effectively required; there is a lighter **"Category E" in-house developer** path with reduced requirements, but that's aimed at businesses building software *for their own use only*, not for offering to others.
- **Effort/cost/time reality:** Expect **6–18+ months** and **tens of thousands of dollars** minimum once you factor in a security assessment (IRAP/ISO27001 audits routinely run **$20k–$80k+**), engineering to SBR/ebMS3, ongoing OSF compliance, annual re-assessment, and DPO liaison. This is a compliance program, not a sprint.

### Super side — SuperStream
- To send contributions directly you need **SuperStream certification** and a **messaging gateway** that speaks the SuperStream data/payment standard (now moving to **v3.0 with Member Verification Request**). Most players *buy* gateway access (SuperChoice, Beam, ClickSuper) rather than build it — building your own gateway is a specialist, certified, ongoing undertaking.

**Honest advice to give Rhett:** Building Big Star Books into its own STP-lodging, SuperStream-sending compliant engine is a **large, regulated, expensive, ongoing** project — not a weekend feature. The sane path is Section 3: **integrate a provider's API** and let them hold the DSP/SuperStream certification. You get the CRM-as-front-end experience without becoming a regulated fintech.

Sources: ATO DSP Operational Security Framework v6.05 (https://softwaredevelopers.ato.gov.au/sites/default/files/2023-05/DSP_Operational_Security_Framework_Requirements_for_ATO_Digital_Services_v6.05.pdf), ATO requirements for DSPs (https://softwaredevelopers.ato.gov.au/RequirementsforDSPs), DSP Operational Framework page (https://www.ato.gov.au/General/Online-services/ATO-digital-wholesale-services/Digital-service-provider-Operational-Framework/), CAA (https://softwaredevelopers.ato.gov.au/Cloud_Software_Authentication_and_Authorisation).

---

## 5. TFN / privacy handling — where TFNs may and may not live

- **Governing rules:** the **Privacy (Tax File Number) Rule 2015** issued under s17 of the **Privacy Act 1988** controls collection, storage, use, disclosure, security and disposal of TFNs. Breaching it is an "interference with privacy" under the Privacy Act (OAIC enforces).
- **You MAY** collect and hold employee TFNs for payroll/super, and store them electronically **provided you use secure methods** (access control, encryption, audit) and **securely dispose** of them when no longer needed. TFN declaration records must be **retained ~5 years** per ATO record-keeping.
- **Under STP Phase 2**, TFN + withholding info is reported automatically through payroll software each pay cycle — a separate paper TFN-declaration lodge to the ATO is generally **not** required, but you must **retain the records**.
- **You MAY NOT** use a TFN as a general identifier, share it beyond authorised recipients (ATO, the employee's super fund via SuperStream, your payroll/clearing-house provider acting for you), or store it insecurely.

**What this means for Big Star Books (Supabase):** if TFNs are ever stored in the CRM database, that database must meet TFN Rule security standards — **encryption at rest, strict row-level/role access control, audit logging, and a disposal policy.** The lowest-risk design is to **NOT store raw TFNs in your own DB at all** — collect them straight into the compliant payroll/STP provider and let *them* be the TFN custodian, so your Supabase instance never holds them. If you do hold them, treat that table as your highest-sensitivity data (Supabase RLS + column encryption + restricted service-role access + logging).

Sources: OAIC TFN guidance (https://www.oaic.gov.au/privacy/privacy-legislation/the-privacy-act/tax-file-numbers), ATO payer information & obligations (https://www.ato.gov.au/forms-and-instructions/tfn-declaration/payer-information-and-obligations), ATO STP reporting rules (https://www.ato.gov.au/businesses-and-organisations/hiring-and-paying-your-workers/single-touch-payroll/in-detail/single-touch-payroll-employer-reporting-guidelines/rules-of-reporting-through-stp).

---

## TOP RECOMMENDATION

**Cheapest fully-compliant path for BSC right now:**

> **Pick a free super-fund clearing house as your default fund (Australian Retirement Trust, Hostplus, or AustralianSuper's new Employer Portal) for the SuperStream super payments — $0 — and pair it with a cheap ATO-approved STP tool for wage reporting.**

Concretely, in order of preference:

1. **All-in-one, simplest to run:** **Reckon Payroll** (or **Payroller**) — ~$16–22/mo, STP + Beam super built in, Payday-Super ready, scales cleanly to 10 staff. Least moving parts. (Also price **ClockOn's free ≤20-employee tier** — could make this $0.)
2. **Absolute cheapest, two-piece:** **Single Touch** for STP at **10¢/employee/pay** + a **free ART/Hostplus/AustralianSuper clearing house** for super. Total spend is a few dollars a month. Slightly more manual (two systems), but rock-bottom cost and fully compliant.
3. **Free-while-tiny:** **e-PayDay FREEPAY** (free ≤3 employees) + free fund clearing house — $0 today, but you'll outgrow the 3-person cap before you reach 10, so treat it as a stopgap.

**My single top pick:** **Free super-fund clearing house (ART or Hostplus) + Single Touch's low-cost STP.** It's the cheapest compliant combination, and — crucially — **Single Touch also exposes a free developer API**, which sets up the future CRM integration without re-platforming.

**Is the "CRM front-end + provider API" approach realistic? Yes — with the right partner, not by building compliance yourself.** Have Big Star Books call a **Sending Service Provider's API (Single Touch is the strongest candidate) for the STP lodge** and a **clearing-house gateway (SuperChoice/ClickSuper, or Single Touch's Payday-Super platform) for the SuperStream payment.** That keeps BSC out of the ATO DSP program entirely — the provider holds the certification. It's a real integration project (weeks, plus provider onboarding), but it is **not** the multi-year, tens-of-thousands-of-dollars regulated build that becoming your own DSP would require (Section 4). Do NOT build your own STP/SuperStream engine.

**Immediate action before 30 June 2026 (already past — do now):** download your SBSCH history, register as an employer with your chosen default fund's clearing house, and set up your chosen STP tool so the first post-1-July pay run lodges and pays super within the 7-business-day Payday-Super window.

> Reminder: prices and free tiers move constantly — reconfirm ClockOn's free tier, QuickSuper commercial pricing, ClickSuper retail pricing, and Single Touch's API terms directly before committing.
