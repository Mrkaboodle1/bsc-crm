# Morning briefing — 13 May 2026

Hey Rhett — Jackie here. While you slept, the CRM moved from "sign-in shell" to "killer feature live."

## What you wake up to

### 1. Roll Call is BUILT ⭐ — the iPad killer feature

Visit **https://app-chi-silk-29.vercel.app/demo/roll-call** on your iPad RIGHT NOW (no sign-in needed) to play with it.

- **Class picker** — every class for today as a big card, progress bar showing how many are marked
- **Attendance grid** — big tap-tiles, one per student
- **Tap a tile** to cycle status: not marked → ✅ here → ⏰ late → ❌ absent → back to blank
- **Tap the ⭐** in the corner of any tile → award 1, 2 or 3 stars + reason + optional note
- **Medical alert ⚕** appears on tiles for kids with health notes (visible at a glance to the coach)
- **"Mark all here" button** for when the whole class shows up
- Auto-saves on every tap (no Save button)
- Star tier badge (`⭐⭐⭐⭐⭐`) updates in real time as you award

This works on your iPad in Safari right now. Tap things. Feel it. Tell me what to change.

### 2. Star Ledger preview ⭐

Visit **https://app-chi-silk-29.vercel.app/demo/stars**

- KPI tiles: stars this week, awards this week, top student, BigStar Trainee count
- The 5-tier ladder (Spark / Shining / Rising / Star / BigStar Trainee) with thresholds
- Recent activity timeline — every star awarded, by who, for what

### 3. A `/demo` mode you can show anyone

Visit **https://app-chi-silk-29.vercel.app/demo**

Three demo screens — Dashboard, Roll Call, Star Ledger — all clickable, all mock data, no sign-in. Use this to:
- Demo the platform to friends/coaches/future tenants
- Sales-pitch to other studios who'd buy this from you
- See what's coming without needing real data

### 4. The real (sign-in) experience

The real `/dashboard`, `/roll-call`, `/stars` are wired up and pull from Supabase via RLS — but you need to be signed in. Email delivery to admin@bigstarcircus.com.au seems to be the blocker.

---

## What you need to do this morning

### Step 1 — Apply migration 003 (one SQL paste, gives you real data)

1. Go to **supabase.com** → your project → **SQL Editor**.
2. Click **+ New query**.
3. In Notepad, open:
   `C:\Users\Rhett Morrow\my-assistant\bsc-crm\schema\003_seed_test_data_and_widen_provisioning.sql`
4. Select all (Ctrl+A), copy (Ctrl+C), paste into the query.
5. Click **Run**.

This gives you 18 sample families, 18 students aged 2–33, real enrolments, and 12 star ledger entries. AND it widens the sign-up trigger so any future coach who signs in is auto-provisioned as `coach`.

### Step 2 — Figure out the magic-link email

The magic-link email was sent to `admin@bigstarcircus.com.au` but you didn't get it. Three things to check, in order:

1. **Check the inbox.** Especially **Junk / Spam**. Sender = `noreply@mail.app.supabase.io`.
2. **Try a different email.** In the sign-in form, type your **rhettbigstar@hotmail.com** instead. Migration 003 makes 2nd+ users into 'coach' role automatically. Then I can promote you to owner later.
3. **If still no email**, Supabase free tier has a low send limit. We can fix this by adding **Resend** as the custom SMTP provider — it's free for 3,000 emails/month and uses the bigstarcircus.com.au domain so it'll never go to spam. Tell me when you're ready and I'll wire it up.

### Step 3 — Custom domain (when you're ready)

The site is at `app-chi-silk-29.vercel.app`. To get it on `crm.bigstarcircus.com.au`:

1. Log into **crazydomains.com.au**.
2. Open `bigstarcircus.com.au` → DNS Management.
3. Add a CNAME: Name = `crm`, Value = `cname.vercel-dns.com`, save.
4. Tell me — I'll add the domain in Vercel.

---

## Build progress

| Slice | What | Status |
|---|---|---|
| 1 | Auth + dashboard + tenant + user setup | ✅ Live |
| 2 | **Roll Call on iPad — the killer feature** | ✅ Live |
| 3 | Star Ledger (preview) | ⭐ Partial — KPIs + timeline live, per-student page next |
| 4 | Stripe sync | ⏳ Soon |
| 5 | Lead capture + auto-email/SMS | ⏳ Soon |
| 6 | Bookings (parties / KNO / workshops) | ⏳ Soon |
| 7 | Tectonic data migration + cutover | ⏳ Soon |
| 8 | Parent portal v1 | ⏳ Soon |

## Numbers from overnight

- **27 routes** live (was 16)
- **15 sidebar items** all navigable (no 404s)
- **2 new migrations** ready to apply (002 already applied, 003 to come)
- **6 demo screenshots** taken — see C:\Users\Rhett Morrow\bsc-1x-*.png
- **2 deploys** to Vercel production
- **0 broken builds**

## What I'd build next

When you're back at the keyboard, tell me which to do first:

- **A. Custom SMTP via Resend** — fixes the email problem permanently, ~30 min
- **B. Per-student page** — tap a student in Roll Call or Star Ledger to see their profile, all stars ever earned, attendance history, family link
- **C. Slice 4 Stripe sync** — payment state for every family, failed-payment recovery
- **D. Slice 5 Lead capture** — public form that creates a lead, triggers welcome email/SMS

My recommendation: A first (so anyone can sign in), then B (rounds out Slice 3 properly).

---

🎪 — Jackie
