# Handoff for Rhett — Server-Jacky deploy

*Written: 15 May 2026 · While you were teaching class*

---

## What I built while you were away

✅ **Migration 006** — three new database tables ready to apply
✅ **Server-Jacky agent** — complete Node.js code, compiles cleanly
✅ **CRM `/inbox` page** — your phone interface to approve drafts (LIVE at https://app-chi-silk-29.vercel.app/inbox once you sign in)
✅ **Sidebar nav updated** — Inbox now sits between Today and Roll Call

The full agent is committed in `server-jacky/`. README + systemd unit + CLI tools all there.

---

## What I need from you (in order) to deploy

### 1. Click **Resize Droplet** in DigitalOcean

You stopped before clicking the blue Resize button. The droplet's still off. Click it. Wait ~1 min for it to reboot at 1 GB.

### 2. Get the **admin@bigstarcircus.com.au Titan password**

If you know it → save it in your Notepad next to the API key.
If you don't → Crazy Domains → Email Accounts → 3-dot menu next to admin@ → **Reset Password**. Save the new password.

### 3. Get the **Supabase service role key**

1. Open **https://supabase.com/dashboard/project/dbpbfcxhbaeyoyoyllfp/settings/api**
2. Find the **"service_role"** key (NOT the anon key — it's a different one, marked SECRET).
3. Click reveal → copy.
4. Save it to your Notepad next to the others.

**⚠ The service role key is god-mode access to your CRM database. Never paste it anywhere except Notepad on your laptop + the server's `.env` file.**

### 4. Apply **migration 006**

1. Open Supabase → SQL Editor → **+ New Query**.
2. Open in Notepad: `C:\Users\Rhett Morrow\my-assistant\bsc-crm\schema\006_agent_queue.sql`
3. Ctrl+A, Ctrl+C, paste into Supabase, **Run**.
4. Should say *"Success. No rows returned"*.

---

## Then ping me and I'll do the rest

Once you've got:
- ✅ Resized droplet (back online)
- ✅ admin@ Titan password (in Notepad)
- ✅ Supabase service role key (in Notepad)
- ✅ Migration 006 applied

…tell me **"Jacky go"** and I'll:

1. Create `.env` locally with your secrets (you paste them in)
2. Test connection from your laptop: `npm run test:claude` + `npm run test:imap`
3. Rsync agent code to the VPS (`/opt/jacky/`)
4. Copy `.env` to the VPS
5. Install Node deps + build
6. Install systemd unit + start `jacky-bsc.service`
7. Watch the first triage cycle live — Jacky reads admin@'s 99 unread emails and pushes drafts into `/inbox`
8. You open https://app-chi-silk-29.vercel.app/inbox on your phone, tap approve on the first one, watch it send for real

---

## What you'll have when this is live

- Every email landing in **admin@bigstarcircus.com.au** gets read by Jacky within 15 min
- Jacky classifies it (trial enquiry / birthday party / NDIS / school gig / cancel / etc.)
- Jacky drafts a warm BSC-voice reply
- The draft lands in `/inbox` with priority + reasoning
- You tap **✅ Approve** from your phone → it sends from admin@ within 60 sec
- You tap **✏️ Edit** to tweak before send
- You tap **✖ Reject** if Jacky got it wrong
- Every action is logged in `agent_activity` so we can review Friday meetings

Stage 1 = you approve every send. Stage 2 = auto-reply known patterns. Stage 3 = autonomous, escalates exceptions.

---

🎪 — Jacky
