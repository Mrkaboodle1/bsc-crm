# BSC CRM — What's Done + What's Next

**Status as of:** 2026-05-12, late morning
**By:** Jackie

---

## ✅ What I built autonomously this morning (no credentials needed)

| # | Deliverable | File path | Why it matters |
|---|---|---|---|
| 1 | **Standalone iPad Roll Call app** — works TODAY in Safari, no backend, localStorage-based | `standalone-roll-call.html` | You can take a real roll in tomorrow's Monday classes. Right now. |
| 2 | Master Build Plan — 14 sections, the full architecture | `MASTER-BUILD-PLAN.md` | The single source of truth for the project |
| 3 | Database schema — 10 tables, RLS, triggers, BSC class + coach seed data | `schema/001_initial.sql` | Ready to paste into Supabase SQL editor |
| 4 | Next.js 15 app scaffold — TypeScript + Tailwind + App Router | `app/` | Full project initialised, 359 npm packages installed |
| 5 | Supabase client helpers (browser + server) | `app/src/lib/supabase.ts` | The two ways the app talks to your database |
| 6 | Environment variables template | `app/.env.example` | All the secrets the app needs |
| 7 | README + .gitignore | `README.md`, `.gitignore` | Standard project hygiene |
| 8 | Git repository initialised + first commit | `.git/` | Code is version-controlled locally |

---

## 🟢 Use the standalone Roll Call TONIGHT — zero setup

This is a **single HTML file** that runs entirely in your iPad's Safari. No signups, no backend, no internet needed after first load. All data saves to your iPad locally.

### How to get it on your iPad — 3 ways:

**Easiest — Email it to yourself:**
1. On your computer, open File Explorer
2. Navigate to: `C:\Users\Rhett Morrow\my-assistant\bsc-crm\`
3. Right-click `standalone-roll-call.html` → Send to → Mail recipient (or attach to a new email)
4. Email it to yourself
5. Open the email on your iPad, tap the attachment, choose "Open in Safari"

**Or — Drag onto Safari directly:**
1. If you have your computer + iPad connected via cable
2. Use AirDrop (Mac) or a file-sharing app to transfer the HTML
3. Open in Safari

**Or — Save to OneDrive/Dropbox:**
1. Drop the HTML file in your OneDrive or Dropbox folder
2. Open OneDrive/Dropbox app on iPad
3. Tap the file → Open in Safari

### Once it's open on your iPad:
1. Tap the **Share button** in Safari (the box-with-up-arrow icon)
2. Scroll down → **Add to Home Screen**
3. Name it "BSC Roll Call" → Add
4. You now have an app icon on your iPad home screen. Tap it, it opens full-screen like a native app.

### What it does:
- Pick a day (Mon–Sat) → see all your classes for that day
- Tap a class → see students enrolled
- Tap a student → cycles status (Present → Absent → Late → Make-up)
- **Long-press a student** → award 1, 2, or 3 stars + pick reason
- Counts update live at top (✅ ❌ ⏰ 🔄)
- Coach notes field at bottom
- Tap "SAVE + SUBMIT ROLL" when done
- All rolls saved to **History** tab
- All stars rolled up by student in **Stars** tab (with auto tier calculation: Spark → BigStar Trainee)

### Limitations of the standalone version (intentional, by design):
- ❌ Single device — data stays on whichever iPad you use
- ❌ No cloud sync — switch iPads = data on old one stays there
- ❌ No multi-user — Rhett's data and Tamara's data don't merge
- ❌ No connection to Stripe / families / leads
- ❌ Browser cache clear = data wiped (so export periodically — feature coming Week 2)

**These limitations are EXACTLY what the cloud version fixes.** This standalone is the "use it tonight" version. The cloud version is the "use it forever" version.

---

## 🔧 What I CANNOT do without your credentials

Honest truth — these are the few things that genuinely need your hand:

### To deploy the cloud version (the real thing) I need:

1. **Your GitHub username** — so I write the right repo URL in the docs.
2. **Confirmation you've signed up for Supabase + the project URL + anon key.**
   - Go to https://supabase.com/dashboard
   - If you don't have a project, click "+ New project" → name it `bsc-crm`, region = Southeast Asia (Singapore)
   - Once created, go to Project Settings → API
   - Copy the **Project URL** (looks like `https://abc123.supabase.co`)
   - Copy the **anon public** key (the LONG eyJhbGc... string)
   - Send both to me in chat.
3. **Vercel account confirmed signed up** — just say "yes" or share the email you used. I'll deploy via the GitHub integration once the repo is connected.
4. **DNS record at Crazy Domains** — when we're ready to wire `crm.bigstarcircus.com.au`, I'll send you the exact record to add (1 CNAME pointing to Vercel — ~5 min).

That's it. Four things. Each takes 1–5 minutes of your time.

---

## 📅 Realistic delivery timeline once I have those 4 things

| Day | Deliverable |
|---|---|
| **Day 0 (today)** | Standalone iPad app live ✅ |
| **Day 1** (you sign up Supabase + share keys) | Schema applied to your Supabase. Next.js app deployed to Vercel temp URL. You can log in. |
| **Day 2** | `crm.bigstarcircus.com.au` live + auth + tenant + user setup |
| **Day 3-7** | Slice 1: foundation + dashboard |
| **Week 2** | **Slice 2: Roll Call on iPad — cloud version replaces standalone** ⭐ |
| **Week 3** | Slice 3: Star Ledger + Student profile |
| **Weeks 4-8** | Slices 4-8 per MASTER-BUILD-PLAN |

---

## 📋 To summarise: 4 minutes of your time today

1. **Open `standalone-roll-call.html` on your iPad** → use it for the next class
2. **Send me your Supabase project URL + anon key** (when you've signed up)
3. **Send me your GitHub username**
4. **Confirm Vercel signed up**

I'll handle everything else.

🎪 — Jackie
