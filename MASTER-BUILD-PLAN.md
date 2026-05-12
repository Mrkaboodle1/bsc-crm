# BSC CRM — Master Build Plan

**Project codename:** `bsc-crm` (working name — final brand TBD: "BigStar CRM"? "Star Stack"? "RingCRM"?)
**Drafted:** 2026-05-12 by Jackie
**Owner:** Rhett Morrow
**Tech lead:** Jackie + Claude (pair-coding with Rhett)
**Goal:** Build a custom, BSC-owned multi-tenant CRM for kids-activity businesses. BSC = customer #1. Eventual SaaS resale at $50–100/mo to other circus / dance / gym / cheer / martial-arts schools.

---

## §1 — Strategic context

This isn't "a CRM for BSC." This is **the foundation of a future SaaS product line**, with BSC as the canonical Customer #0.

Three layers of value, in order:

1. **Layer 1 (Year 1):** Replace Tectonic. Run BSC's operations on it. Cost-recover $80–$100/mo CRM spend. Win = working business tool.
2. **Layer 2 (Year 2):** Battle-test on BSC for 12 months. Document the workflows. Polish the UX. Win = product-market fit proven.
3. **Layer 3 (Year 3+):** Sell to other kids-activity businesses as SaaS. $50–100/mo per customer × 50–500 customers = $30K–$600K ARR. Win = scalable revenue stream + exit asset.

Architecture decisions made TODAY support all three layers. Multi-tenant from Day 1 = no Year 3 rebuild.

---

## §2 — Tech stack (locked)

| Layer | Choice | Why | Cost (BSC scale) |
|---|---|---|---|
| **Frontend framework** | Next.js 15 (App Router) | Modern React, SSR, mobile-friendly, huge ecosystem | $0 (open source) |
| **UI components** | Tailwind CSS + shadcn/ui | Copy-paste accessible components, BSC-brandable | $0 |
| **Database + Auth + Storage** | Supabase (Postgres) | Free tier generous (500MB DB, 1GB storage, 50K MAU). Built-in Row-Level Security for multi-tenancy. SQL we can export anytime. | **Free** to start |
| **Hosting** | Vercel | Free Hobby tier sufficient for BSC scale. Auto-deploys from GitHub. Edge functions for API routes. | **Free** to start |
| **Code repository** | GitHub (private) | Source of truth. Free for private repos. | Free |
| **Payments** | Stripe Billing (already in use) | Subscription engine + invoicing. Webhook events to CRM. | Per-transaction fees only |
| **Card-present payments** | Square (already in use) | EFTPOS at studio. Sync via API. | Per-transaction fees only |
| **Transactional email** | Resend | 100 emails/day free; $20/mo at 50K/mo. Best DX. | **Free** to start |
| **SMS** | ClickSend (Australian) | $0.04/SMS, AU residency. Cheaper than Twilio at our volume. | Pay-per-SMS |
| **AI** | Claude API + (optional) OpenAI | Caption drafting, embeddings, churn prediction | Pay-per-token |
| **AI receptionist (Phase 2)** | Vapi + ElevenLabs voice | Out-of-hours call handler | ~$0.05/call/min |
| **Workflow automation (Phase 2)** | Either Inngest, Trigger.dev, or native cron jobs | Async tasks (failed-payment retry, birthday emails, etc.) | Free tier sufficient |
| **Monitoring** | Sentry (errors) + PostHog (product analytics) | Both have free tiers | **Free** to start |

**Total monthly cost Year 1 at BSC scale: $0–$15/mo** (only ClickSend SMS + Stripe fees).
**Total monthly cost Year 2 at growth scale (~200 subs): ~$45/mo** (Vercel Pro $20 + Supabase Pro $25).

---

## §3 — Multi-tenant architecture (Day 1 decision)

Every database table has a `tenant_id` column. Every row belongs to exactly one tenant. Supabase Row-Level Security (RLS) policies enforce isolation at the database layer — even a bug in app code can't accidentally show Tenant A's data to Tenant B.

### How tenants are identified

- **Subdomain routing** (preferred for SaaS): `bigstarcircus.crm.example.com` → tenant `bigstarcircus`
- **Path routing** (works on a single domain): `crm.example.com/bigstarcircus/...`
- **Custom domains** (Year 2+): `crm.bigstarcircus.com.au` → tenant `bigstarcircus`

For BSC v1, we use a single domain `crm.bigstarcircus.com.au` and skip subdomain complexity. Tenant ID is hard-coded as `bigstarcircus` in the initial config. When customer #2 onboards, we activate full multi-tenant routing.

### Tenant table

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,        -- e.g. 'bigstarcircus'
  name TEXT NOT NULL,                -- 'Big Star Circus'
  primary_colour TEXT DEFAULT '#D72027',
  accent_colour TEXT DEFAULT '#FFC107',
  logo_url TEXT,
  stripe_account_id TEXT,            -- Stripe Connect account for SaaS billing
  status TEXT DEFAULT 'active',
  plan TEXT DEFAULT 'founder',       -- 'founder' (BSC = free) / 'starter' / 'pro'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO tenants (slug, name) VALUES ('bigstarcircus', 'Big Star Circus');
```

### Every other table

```sql
-- Example: families table
CREATE TABLE families (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  -- ... other fields
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policy — users only see their tenant's rows
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_families" ON families
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

Every CREATE TABLE in this project follows this pattern. **No exceptions.**

---

## §4 — User roles + permissions

Each tenant has multiple users with different roles:

| Role | Can do | Examples |
|---|---|---|
| `owner` | Everything. Manages billing, users, tenant settings. | Rhett |
| `manager` | Manage classes, coaches, students, bookings. Read-only on billing. | Future Studio Manager |
| `coach` | Take roll call, award stars, view their classes only. Cannot see other coaches' classes. | Rodrigo, Tamara, Charlie/Aliyah/Lewis when they level up |
| `parent` | View their own kids' attendance + stars. Manage their subscription. Cannot see other families. | All BSC families |
| `support` | Read-only of everything in the tenant. | Lana the accountant (if needed) |

RLS policies enforce these at the database layer. App code is the second line of defence.

---

## §5 — Database schema (10 core tables for v1)

Full SQL in `schema/001_initial.sql`. Summary:

| # | Table | Purpose |
|---|---|---|
| 1 | `tenants` | The multi-tenant root |
| 2 | `users` | Anyone who can log in (linked to Supabase Auth) |
| 3 | `families` | The customer household / billing entity |
| 4 | `students` | Children, linked to families |
| 5 | `coaches` | Staff (employees + contractors), linked to users where relevant |
| 6 | `classes` | Recurring weekly classes (e.g. "Mon 3:45 Circus Acro 5–8") |
| 7 | `enrolments` | The link between a student and a class |
| 8 | `attendance` | One row per (student × class × date) — **the Roll Call backbone** |
| 9 | `star_ledger` | Every Star ever awarded — the BSC IP |
| 10 | `subscriptions` | Stripe-synced subscription state |

Phase 2 tables (Week 5+): `leads`, `bookings`, `payments`, `invoices`, `documents`, `email_campaigns`, `tasks`, `ndis_clients`, `schools`, `performance_gigs`.

---

## §6 — The build, sliced

### Slice 1 — Foundation (Week 1)
- Init Next.js project, deploy to Vercel
- Supabase project + DB schema applied
- Auth (email + magic link)
- Basic tenant + user setup (BSC tenant + Rhett user)
- Empty dashboard ("Welcome to BSC CRM, Rhett")

**Deliverable:** You can log in at `crm.bigstarcircus.com.au` and see your name. Empty but real.

### Slice 2 — Roll Call ⭐ (Week 2)
- Classes + Students + Enrolments tables seeded with BSC's actual data
- iPad-optimised Roll Call screen (`/coach/roll-call`)
- Big tap-tiles, status cycle (Present → Absent → Late → Make-up)
- Long-press = award stars
- Auto-saves per tap
- Coach notes field
- Works offline (PWA-capable)

**Deliverable:** Rhett takes the Mon afternoon Circus Acro roll on his iPad. The killer feature.

### Slice 3 — Star Ledger + Student Profile (Week 3)
- Per-student profile page
- Total stars rollup
- 5-tier calculation (Spark → BigStar Trainee)
- Star history timeline
- Tier-up celebration screens
- Coach can award stars outside class via Quick Award form

**Deliverable:** The Star Reward System lives in the platform — proof of the BSC IP.

### Slice 4 — Stripe sync + Families view (Week 4)
- Stripe webhook → Supabase
- Family + Subscription tables sync live
- Active sub count visible
- Failed-payment alerts
- Family detail page (linked students, active subs, billing history)

**Deliverable:** All 56 subscribers visible + accurate in the CRM.

### Slice 5 — Lead capture + auto-email/SMS (Week 5)
- Public lead form embeddable on bigstarcircus.com.au
- Auto-email via Resend
- Auto-SMS via ClickSend
- Lead pipeline view (Kanban-style stages)
- Task creation for follow-up

**Deliverable:** Tectonic's primary use case replicated + improved.

### Slice 6 — Bookings (Week 6)
- Birthday party booking form + flow
- KNO event ticketing
- Holiday workshop registration
- Schools incursion enquiry capture

**Deliverable:** All revenue streams trackable in one place.

### Slice 7 — Polish + Tectonic data migration (Week 7)
- Bulk import 1,625 Tectonic contacts
- Deduplicate
- Tag normalisation
- Stripe re-link
- Parallel run with Tectonic for 1 week as safety net

**Deliverable:** Full data parity.

### Slice 8 — Parent portal v1 (Week 8)
- Parents log in (magic link)
- See their kids' stars + tier
- See attendance history
- Manage their subscription
- Book birthday parties

**Deliverable:** Self-serve parent experience, reduces admin load.

---

## §7 — Roll Call iPad UX (deeper detail)

The single most important screen. Designed for **during-class use** by a coach holding an iPad in one hand.

### Path: `/coach/roll-call` (or `/coach/today` showing all today's classes)

### Layout (iPad portrait)

```
┌──────────────────────────────────────────┐
│  🎪 Big Star Circus              [Rhett]  │
├──────────────────────────────────────────┤
│  Circus Acro 5–8  ·  Mon 3:45 PM         │
│  10 enrolled · 0 marked                  │
├──────────────────────────────────────────┤
│                                          │
│  [Tara Sonyx        ]  ⏰  ⭐ 0          │
│  [Mary Anne Claridge]  ⏰  ⭐ 0          │
│  [Charlie Morrow    ]  ⏰  ⭐ 0          │
│  [Aliyah Johnson    ]  ⏰  ⭐ 0          │
│  [Lewis Bennett     ]  ⏰  ⭐ 0          │
│  [Savannah Edwards  ]  ⏰  ⭐ 0          │
│  [Grace Debart      ]  ⏰  ⭐ 0          │
│  [Alessandra Silvioli] ⏰  ⭐ 0          │
│  [Juliana Wolf      ]  ⏰  ⭐ 0          │
│  [Jasmine Makings   ]  ⏰  ⭐ 0          │
│                                          │
├──────────────────────────────────────────┤
│  Coach notes (optional)                  │
│  [_______________________________________]│
├──────────────────────────────────────────┤
│  [        SAVE + SUBMIT ROLL         ]   │
└──────────────────────────────────────────┘
```

### Interactions

- **Tap a student tile** → cycles status: ⏰ (unmarked) → ✅ Present → ❌ Absent → ⏰ Late → 🔄 Make-up → back to start
- **Long-press a student tile** → opens a quick modal: "Award stars to Tara?" with [+1] [+2] [+3] buttons + reason dropdown (Skill / Discipline / Attendance / Other) + optional "what for?" text field. Tap to confirm.
- **Tap "SAVE + SUBMIT ROLL"** → writes all attendance rows + star ledger rows in a single transaction. Coach lands back on the day overview.
- **Auto-save every tap** → if iPad battery dies mid-class, nothing is lost.
- **Offline support** → service worker caches the class roster. If WiFi drops, taps queue locally and sync when reconnected.

### Tap target sizing

All tap targets minimum **64pt** (more than Apple's 44pt minimum) — coach is in the middle of teaching, not focused on the screen.

### Colour coding

Status pills visible at a glance:
- ✅ Present → green
- ❌ Absent → red
- ⏰ Late → amber
- 🔄 Make-up → blue
- ⏰ (unmarked) → grey

Coach can glance at the iPad mid-class and know who's where.

---

## §8 — Star Reward System integration

The Star Reward System SOP defined:
- **5 tiers:** Spark (0-5) → Apprentice (6-15) → Skilled Star (16-35) → Performer-in-Training (36-75) → BigStar Trainee (76+)
- **Stars earned via:** skill milestones, discipline moments, attendance, Google reviews, social tags, referrals, showcase performance

In the platform:
- Every Star awarded → row in `star_ledger`
- Student's total stars = SUM over their ledger rows (cached as a `students.total_stars` denormalised column for performance)
- Student's tier = formula based on total_stars
- **Tier-up triggers:** automation sends Rhett an email "🎉 Charlie just hit Tier 4 — invite to Trainee Programme?"
- **Parent visibility:** parent portal shows kid's tier + total stars + recent stars (with reasons if not confidential)
- **Marketing flywheel:** "Free Star for Google Review" — Rhett adds a star from the admin panel after a review lands

---

## §9 — Migration path from Tectonic

We do NOT cancel Tectonic until the platform is fully live. **30-day overlap buffer.**

### Stage 1 (during Week 4) — Export from Tectonic
- Bulk CSV export of contacts (1,625)
- CSV export of opportunities
- CSV export of class enrolments
- Screenshots of workflows for reference

### Stage 2 (Week 7) — Bulk import to BSC CRM
- Clean the data (dedupe, normalise tags, fix typos like "Singed up for free trial")
- Import via Supabase's CSV import OR a custom script
- QA: count check, key contact spot-check
- All 1,625 contacts visible in the platform

### Stage 3 (Week 7-8) — Run side-by-side
- Tectonic continues to receive any stale lead form submissions
- BSC CRM is primary
- 7 days of parallel running
- No data loss

### Stage 4 (end of Week 8) — Cancel Tectonic
- Tectonic subscription cancelled — final invoice paid
- Joe's FB ad management ended too
- **$6,000/yr recovered**

---

## §10 — What gets paid for + when

| Service | Free tier limit | When BSC outgrows | Paid tier cost |
|---|---|---|---|
| Vercel | 100GB bandwidth/mo | ~Year 1 end | $20/mo Pro |
| Supabase | 500MB DB, 1GB storage, 50K MAU | ~Year 2 (more storage needed for photo consent files) | $25/mo Pro |
| Resend | 100 emails/day | ~Month 6 (term-start campaigns hit this) | $20/mo (50K emails) |
| ClickSend SMS | Pay-per-message ($0.04 AU SMS) | Always pay per-SMS | ~$30-50/mo at BSC volume |
| Stripe | Per-transaction fees only | N/A | 1.7% + $0.30 AU domestic cards |
| GitHub | Unlimited private repos | N/A | $0 (private OK on free) |
| ElevenLabs (Phase 2 voice) | 10 min/mo free | When AI receptionist launches (Month 8) | $5-$22/mo |
| Vapi (Phase 2 calls) | $10 free credit | When AI receptionist launches | $0.05/min |

**Year 1 expected cost: $5–$50/mo all-in** (mostly SMS).
**Year 2 expected cost: $80–$150/mo** (Pro tiers + scaled SMS).

---

## §11 — IP + security

### Code ownership
- Code lives in **Rhett's GitHub** (private repo)
- BSC Pty Ltd owns the IP via the standard work-for-hire arrangement
- No license to Anthropic, Supabase, Vercel, or any other vendor for the BSC-specific code

### Data ownership
- Supabase project belongs to Rhett's account
- Database can be exported to Postgres dump file anytime
- Backups: Supabase free tier = daily backups for 7 days; Pro tier = 14 days + point-in-time recovery
- BSC also runs weekly off-platform backup to Rhett's local drive (cron'd export)

### Security
- All data in transit: HTTPS only
- All data at rest: Supabase encrypts (AES-256)
- Auth: Supabase Auth + magic-link email + optional MFA (Year 2)
- RLS policies enforce tenant isolation at database layer
- Sentry monitors errors with PII masking
- Annual penetration testing target by Year 3 (pre-SaaS launch)

### Australian compliance
- APP (Australian Privacy Principles) — BSC has under $3M turnover so technically exempt, but we comply by best practice
- Children's Online Privacy Code (OAIC) — final 10 Dec 2026, design for compliance from Day 1
- Photo consent stored explicit per-family record + revocable

---

## §12 — What I'm starting now (without waiting for Rhett's signups)

Effective immediately:

| # | Artefact | Status |
|---|---|---|
| 1 | This `MASTER-BUILD-PLAN.md` | ✅ Done |
| 2 | `schema/001_initial.sql` — full Postgres DDL | ✅ Done (see file) |
| 3 | `README.md` — project overview | ✅ Done |
| 4 | `.gitignore` for Next.js project | ✅ Done |
| 5 | Next.js scaffolded folder structure (`app/`, `lib/`, `components/`) | 🔄 To do this session |
| 6 | Roll Call screen mockup HTML (no backend, just UI) | 🔄 Next session |

---

## §13 — What I need from Rhett — 6 free signups, ~15 minutes total, $0

| # | Service | URL | Sign in with | Time |
|---|---|---|---|---|
| 1 | **GitHub** | https://github.com/signup | rhettbigstar@hotmail.com | 3 min |
| 2 | **Vercel** | https://vercel.com/signup | "Continue with GitHub" | 2 min |
| 3 | **Supabase** | https://supabase.com/dashboard/sign-up | "Continue with GitHub" | 2 min |
| 4 | (After Supabase signup) **Create a project** named `bsc-crm`, region = Southeast Asia (Singapore) — closest to AU | https://supabase.com/dashboard/new | — | 2 min |
| 5 | **Resend** | https://resend.com/signup | "Continue with GitHub" | 2 min |
| 6 | **Stripe API key** | Log in to your existing Stripe dashboard → Developers → API keys → "Reveal test key" first, paste; we'll create a Restricted key with scoped permissions when we're ready for production | — | 3 min |

**Once those are done — send me the Supabase project URL + anon key (from Project Settings → API), and I take it from there.**

No credit card needed at signup for any of these.

---

## §14 — Open questions for Rhett

1. **Final brand name for the SaaS product** — "BigStar CRM"? Something more generic so it sells to non-circus customers? Recommendation: defer naming until Year 2 when product-market fit is real.
2. **Domain for the CRM** — `crm.bigstarcircus.com.au` (subdomain of your existing domain) is the cleanest path. Confirm OK to set this up at Crazy Domains.
3. **Privacy policy + Terms of Service** — needs to exist before any non-Rhett user logs in. We'll draft both during Week 2 or pull from existing Policy Doc.
4. **First non-Rhett user to add to the CRM** — Rodrigo? Tamara? The new Studio Manager once hired? Recommendation: nobody for v1; we onboard the Studio Manager into the system at their start date.
5. **What does Tectonic export look like?** Need to confirm what export formats Tectonic supports before Week 7 migration.

---

🎪 — Jackie

*The next 8 weeks: from "Rhett's idea" to "BSC's competitive moat." Build the asset.*
