# 🧪 CRM Test Log — page-by-page, button-by-button

**Goal:** test & fix every page/button until rock-solid, so BSC can leave Joe's CRM.
**Method:** Jacky audits each page's code (every link/button → real target + handler)
and fixes breaks; Rhett click-tests the look/feel + interactive (AI/send) bits.
**Started:** 2026-06-11 (cont.)

| ✓ | Page | Code audit | Rhett click-test | Notes |
|---|------|-----------|------------------|-------|
| ✅ | **Home / Dashboard** | PASS — all 5 KPI tiles + 7 quick actions + 3 header links point to real pages. | ✅ PASS — Rhett tested all buttons; purpose clear; great overview page. | DONE 2026-06-11. |
| ⬜ | Contacts | — | — | next |
| ⬜ | Classes | — | — | |
| ⬜ | Rewards | — | — | |
| ⬜ | Marketing | — | — | |
| ⬜ | Finance | — | — | |
| ⬜ | Team | — | — | |
| ⬜ | Inbox | — | — | |
| ⬜ | Admin / Settings | — | — | |
| ⬜ | Calendar | — | — | |
| ⬜ | Roll Call | — | — | |
| ⬜ | Compliance | — | — | |

## 🔍 Whole-app structural sweep (2026-06-11)
- **47 internal navigation links** scanned → **0 dead links** (every button → a real page).
- **39 save/submit API endpoints** called by buttons → **all exist**.
- **Verdict: no broken wiring anywhere in the CRM.** ✅
- Remaining = *behavioural* testing (does each action do the right thing) → Rhett click-tests below.

## Rhett's click-test checklist (behaviour — the bits code can't prove)
- [ ] **Home:** Ask Jacky chat replies
- [ ] **Contacts:** Add Contact saves · search filters · click a contact opens profile
- [ ] **Classes:** Add/Edit class saves & shows
- [ ] **Rewards:** Open in Canva / Print / PDF buttons work
- [ ] **Marketing → Campaigns:** edit, Save, test-send, Results
- [ ] **Marketing → Forms:** edit a form, public link loads, submission lands
- [ ] **Finance:** Payments/MRR figures load · POS rings up a sale · Vouchers logs one
- [ ] **Team:** Add/edit coach saves · assign classes · set password
- [ ] **Inbox:** approve/reject a draft
- [ ] **Settings:** edit business profile saves
- [ ] **Calendar:** add/edit/delete an event
- [ ] **Roll Call:** mark attendance saves · StarBand check-in
- [ ] **Compliance:** docs open + print

## 🔘 CRUD coverage audit (2026-06-12) — Add / Edit / Delete on every entity

Full sweep of every admin entity to confirm you can **Add, Edit, and Delete**.
Most areas were already complete; the gaps below were fixed + deployed today.

| Area | Add | Edit | Delete | Status |
|------|-----|------|--------|--------|
| Contacts / families | ✅ | ✅ | ✅ **NEW** | Delete now in the contact's Edit panel (also removes kids/classes/appointments) |
| Kids / students | ✅ | ✅ | ✅ | In contact profile |
| Appointments | ✅ | ✅ | ✅ | Modal on contact page |
| **Companies** | ✅ | ✅ **NEW** | ✅ **NEW** | Edit + Delete buttons now on each company page |
| Classes | ✅ | ✅ | ✅ | Class form modal |
| Coaches / team | ✅ | ✅ | ✅ | Coaches table |
| Memberships | ✅ | ✅ | ✅ | Plan editor |
| POS products | ✅ | ✅ | ✅ | Manage-products modal |
| Holiday workshops | ✅ | ⚠️ partial | ✅ | Can add/delete a day; can't yet edit a day's details |
| Reward designs | ✅ | ↗ Canva | ✅ | Edit = "Open in Canva" (external) |
| Vouchers (Play On) | ✅ | ✅ | ✅ | Full |
| Campaigns / newsletters | ✅ | ✅ | ✅ | Full editor |
| **Forms** | ✅ | ✅ | ✅ **NEW** | Delete button now on each form row |
| Social posts | ✅ | ⚠️ no edit | ✅ | Edit = delete + recreate for now |
| **Tasks** | ✅ | ✅ **NEW** | ✅ | Edit (✏️) on each task — change title/due/priority |
| Smart lists / segments | ✅ | ✅ | ✅ | Full |
| Inbox | n/a | approve/reject | n/a | Drafts, by design |
| Compliance docs | n/a | n/a | n/a | Read + print, by design |
| Reporting / MRR | n/a | n/a | n/a | Dashboards, by design |
| Settings | n/a | ✅ | n/a | Edit business profile |

**Fixed & deployed today (5 gaps):**
1. Companies — Edit + Delete wired onto each company page.
2. Contacts — Delete a contact (safely cleans up kids, classes, appointments).
3. Tasks — Edit an existing task (title / due date / priority).
4. Forms — Delete a form from the list.
5. Quizzes page — removed from Marketing (you said you won't use it).

**Optional gaps — ALL now done (2026-06-12):**
- ✅ Holiday workshops: edit a day's details (pencil button → edit date/time/price/capacity).
- ✅ Social posts: edit a post in place (Posts tab → ⋯ → Edit caption/image/schedule). New `/api/social/update`.
- ✅ Reward designs: in-app edit (pencil button → edit title/section/links/pages). New `update` action.

## ⭐ StarBand / NFC scanning — readiness pass (2026-06-12)
System was ~85% built (kiosk, register, dashboard, confirm/evac board, 4 input modes:
NFC tap, manual UID paste, face-tap, PIN). Made it demo-ready for physical bands:
- **NEW `/starband/bulk` — Rapid Band Pairing**: tap a band → tap the child → paired
  instantly, no reloads. Live progress (X/Y paired), search, unpaired filter, beep on read.
  This is how to "connect all contacts" fast when the physical bands arrive.
  Linked from the register page (⚡ Rapid pairing button).
- Existing one-by-one register page still there for single adds.
- Bands need only their **UID** (serial) — no special NDEF write. Android Chrome reads
  taps natively; otherwise read the UID with the phone's NFC Tools app and paste it.

## 📝 Roll call — coach notes + editable (2026-06-12)
- Every week cell already tap-to-edit (blank → here → late → absent).
- **NEW**: per-child **Coach note for today** in the ℹ panel (saves to attendance.coach_notes,
  no DB change needed). Rows with a note show a 📝 badge. New `saveCoachNote` action.

## Fixes applied during testing
- 2026-06-12: 5 CRUD gaps closed + deployed (Companies, Contact delete, Tasks edit, Forms delete, Quizzes removed).
- 2026-06-12: 3 optional editors added (Workshops, Social posts, Reward designs).
- 2026-06-12: StarBand Rapid Pairing page + Roll-call coach notes shipped.
