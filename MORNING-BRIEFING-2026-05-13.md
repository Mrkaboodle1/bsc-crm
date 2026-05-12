# Morning briefing — 13 May 2026

Hey Rhett — Jackie here. While you slept, the CRM went from "auth shell" to a real, walkable Tectonic-replacement.

## TL;DR — open this on your iPad right now

**https://app-chi-silk-29.vercel.app/demo**

No sign-in. Click everything. Tell me what to change.

---

## What landed overnight

### 🎪 Slice 2 — Roll Call on iPad (the killer feature)

- **/demo/roll-call** → tap a class → big tap-tile grid per student
- Tap tile to cycle: not marked → ✅ here → ⏰ late → ❌ absent
- Tap the ⭐ on any tile → award 1/2/3 stars + reason + note
- Medical alert ⚕ shows on tiles with health notes (visible to coach at a glance)
- Tier stars badge (`⭐⭐⭐⭐⭐`) on every tile, refreshes after award
- "Mark all here" quick button
- Auto-saves on every tap, no Save button

### ⭐ Star Ledger (Slice 3 partial)

- **/demo/stars** — weekly KPIs, the 5-tier ladder (Spark → BigStar Trainee), recent activity timeline
- Every star ever awarded shown with who, what, why

### 👨‍👩‍👧 Families — list + profile

- **/demo/families** — real list view with search, lifecycle filter, lifecycle pills
- **/demo/families/f9** (Iyer family example) — contact, source, weekly $, all 3 kids on one card with star tiers, billing snapshot

### 🧒 Students — list + profile

- **/demo/students** — table view with search, tier filter, star tier badges
- **/demo/students/s6** (Oscar Edwards example) — tier progression with progress bar, attendance rate, compliance card (photo consent + blue card), every star ever earned, attendance history, family link

### 🎯 Leads — pipeline kanban

- **/demo/leads** — 6-stage kanban: New → Contacted → Trial Booked → Trialled → Enrolled → Lost
- Source emoji on each card (📘 FB / 📸 IG / 🔍 Google / 🚪 walk-in / 🎪 open day)
- Cards link through to the family profile

### 🤝 Coaches — compliance dashboard

- **/coaches** (sign-in needed) — KPI tiles for: active coaches, head coaches, blue cards expiring, first-aid expiring
- Expiry pills colour-coded: red ≤30 days, amber ≤60 days
- Skills chips, role pill, hourly rate

### 🏠 Dashboard

- **/demo/dashboard** — Tectonic-style dark sidebar, BSC red active accent, today's classes, KPI tiles, quick actions, build progress

---

## Numbers from overnight

- **34 routes** live (was 16 yesterday)
- **3 new migrations** (002 + 003 ready; 003 just needs your paste)
- **6 new shared components** (DashboardShell, ComingSoon, StudentListView, StudentProfileView, FamilyListView, LeadsKanban, StarLedgerView)
- **18 sample families, 18 sample students** seeded in migration 003
- **5 deploys** to Vercel production, all green
- **0 broken builds**

---

## What you need to do this morning

### 1. Apply migration 003 (one SQL paste, 2 min)

1. **supabase.com** → your project → **SQL Editor** → **+ New query**
2. Open in Notepad: `C:\Users\Rhett Morrow\my-assistant\bsc-crm\schema\003_seed_test_data_and_widen_provisioning.sql`
3. Ctrl + A, Ctrl + C, paste into Supabase, click **Run**

This seeds 18 families + 18 students + enrolments + 12 star ledger entries AND widens the sign-up trigger so any future coach who signs in becomes 'coach' role automatically.

### 2. Fix the magic-link email

Three options, in order of speed:

- **A. Check admin@bigstarcircus.com.au inbox** (especially spam). Sender = `noreply@mail.app.supabase.io`. If you find it, click the link.
- **B. Use a different email.** Type `rhettbigstar@hotmail.com` in the sign-in form. The widened trigger from migration 003 means you'll become a `coach` role — we can promote you to owner after.
- **C. Custom SMTP via Resend** (the right long-term fix). Resend is free for 3,000 emails/month and uses bigstarcircus.com.au as the sender domain so emails never hit spam. Takes ~30 min to wire up. Tell me to do it.

### 3. Custom domain (when you're ready)

- crazydomains.com.au → bigstarcircus.com.au DNS → add CNAME: name `crm`, value `cname.vercel-dns.com` → save
- Tell me, I'll add the domain in Vercel.

---

## Build progress

| # | Slice | Status |
|---|---|---|
| 1 | Auth + dashboard + tenant + user setup | ✅ Live |
| 2 | **Roll Call on iPad ⭐** | ✅ Live |
| 3 | Star Ledger + per-student tier | ✅ Partial — KPIs + profile timeline live |
| 1.5 | Families + Students + Coaches list/profile | ✅ Live |
| 5 | Lead pipeline kanban (read-only) | ✅ Partial — DnD comes later |
| 4 | Stripe sync | ⏳ Soon |
| 5b | Lead capture form + auto-email | ⏳ Soon |
| 6 | Bookings (parties / KNO / workshops) | ⏳ Soon |
| 7 | Tectonic data migration + cutover | ⏳ Soon |
| 8 | Parent portal v1 | ⏳ Soon |

---

## What I'd build next (you pick)

- **A. Resend SMTP** — fixes email permanently so anyone can sign in. ~30 min.
- **B. Lead capture form** — public form on bigstarcircus.com.au that creates a lead + sends auto-welcome email + auto-SMS. ~2 hours.
- **C. Drag-and-drop in the leads kanban** — drag a card between columns to advance a lead. ~1 hour.
- **D. Slice 4 Stripe sync** — read Stripe webhooks, show real subscription state per family, failed-payment dunning. ~3 hours.
- **E. Classes list view** — table of all 18 classes with enrolment fill bars. ~30 min.
- **F. Marketing / Social Planner** — wire up the IG + FB MCP connections that already exist. ~3 hours.

My recommendation: **A first** (so you can actually sign in), then **B** (so we start replacing Tectonic's form for real).

---

## Screenshots taken overnight

Look in `C:\Users\Rhett Morrow\` for these PNG files:

- `bsc-01-landing-desktop.png` — public homepage
- `bsc-02-login.png` — magic-link sign-in screen
- `bsc-03-dashboard-desktop.png` — dashboard with sidebar
- `bsc-04-dashboard-mobile.png` — dashboard on phone
- `bsc-10-demo-landing.png` — /demo landing
- `bsc-11-demo-dashboard.png` — demo dashboard
- `bsc-12-demo-rollcall-picker.png` — class picker
- `bsc-13-demo-rollcall-attendance.png` — attendance grid (desktop)
- `bsc-14-demo-stars.png` — star ledger
- `bsc-15-demo-rollcall-ipad.png` — attendance on iPad portrait
- `bsc-20-demo-students-list.png` — students list
- `bsc-21-demo-student-profile.png` — Oscar Edwards profile (BigStar Trainee, 5⭐)
- `bsc-22-demo-families-list.png` — families list
- `bsc-23-demo-family-profile.png` — Iyer family (3 siblings)
- `bsc-24-demo-leads-kanban.png` — leads pipeline

---

🎪 — Jackie
