# BSC CRM

Custom-built, multi-tenant CRM for kids-activity businesses. **Big Star Circus = customer #0.** Future SaaS resale to other circus / dance / gym / cheer / martial-arts schools.

## What's in this folder

| File / Folder | Purpose |
|---|---|
| [`MASTER-BUILD-PLAN.md`](./MASTER-BUILD-PLAN.md) | The canonical reference doc — read this first |
| `schema/001_initial.sql` | Initial Postgres schema (10 core tables + RLS + seed data) for Supabase |
| `schema/` | Future migrations will live here as `002_*.sql`, `003_*.sql`, etc. |
| `docs/` | Architecture decision records (ADRs), API contracts, UX mockups |
| (later) `app/` | Next.js 15 App Router source code |
| (later) `lib/` | Shared utilities |
| (later) `components/` | shadcn/ui components |

## Tech stack

- **Frontend:** Next.js 15 (App Router) + Tailwind CSS + shadcn/ui
- **Backend:** Supabase (Postgres + Auth + Storage + Realtime)
- **Hosting:** Vercel (free Hobby tier)
- **Code:** GitHub (private repo, owned by Rhett)
- **Payments:** Stripe Billing
- **Card-present:** Square
- **Email:** Resend
- **SMS:** ClickSend (Australian)
- **AI:** Claude API + (later) OpenAI for embeddings

## Cost to run

| Stage | Monthly cost |
|---|---|
| Year 1 (BSC only, current scale) | **$0–$15/mo** (mostly SMS) |
| Year 2 (200 subs, more storage) | ~$45/mo |
| Year 3 (SaaS launch, multiple tenants) | $100–$250/mo + revenue offset |

## Status

- [x] Master build plan drafted
- [x] Initial database schema written
- [ ] Rhett signs up for GitHub, Vercel, Supabase, Resend (~15 min, $0)
- [ ] Schema applied to Supabase
- [ ] Next.js scaffold deployed to Vercel
- [ ] Slice 1: Auth + dashboard (Week 1)
- [ ] **Slice 2: Roll Call on iPad ⭐ (Week 2)**
- [ ] Slice 3: Star Ledger + Student profile (Week 3)
- [ ] Slice 4: Stripe sync (Week 4)
- [ ] Slice 5: Lead capture + auto-email/SMS (Week 5)
- [ ] Slice 6: Bookings (Week 6)
- [ ] Slice 7: Tectonic data migration + cutover (Week 7)
- [ ] Slice 8: Parent portal v1 (Week 8)

🎪 — Jackie
