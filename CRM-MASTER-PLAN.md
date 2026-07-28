# Big Star CRM — Master Plan: "The CRM That Runs Itself"

**Owner:** Rhett Morrow · **Drafted by:** Jacky · **Date:** 2026-06-09
**Deadline anchor:** Fully tested & functioning by **12 July** (end of school
holidays) — ready to run for **Term 3 (13 July)**, locked in for **Term 4
(6 Oct)** go-live.

---

## 1. The Vision (in Rhett's words)

> "Probably the first CRM to have an actual AI built into it. It's called
> Jacky. Any new franchisee can simply talk to it. It talks back, enhances,
> and actually physically fixes problems. Jacky is the new admin. Each
> franchisee owner is the admin. I'm trying to make each franchisee save money
> by not needing to employ an admin — the coaches can be the admin too,
> because Jacky does the admin work. Jacky is Jarvis. The owner is Tony Stark."

**The one-line pitch:** *Every other CRM is a filing cabinet you operate. Ours
is a teammate you talk to.*

**Why it matters for franchising:** a franchisee doesn't just buy software —
they buy a built-in operations manager who never sleeps, never quits, and
costs a fraction of a wage. That is the thing competitors can't copy quickly,
and it's a recurring-revenue feature you can charge for.

---

## 2. The Honest Build Order (why this sequence)

You can't put a genius brain (Jacky-as-Jarvis) on top of a wobbly body. If the
CRM has bugs, the AI will trip over them and look stupid. So:

| Phase | What | Why it's in this order |
|---|---|---|
| **A. HARDEN & TEST** *(now → 12 July)* | Test every module, fix every bug, lock the core | A stable base is non-negotiable before AI or franchising |
| **B. CENTRAL HIVE** *(automations)* | One n8n you own, every franchise feeds it | Marketing/lead automation, franchise-ready |
| **C. JACKY-IN-THE-CRM** *(the Jarvis brain)* | A chat panel inside the CRM that talks back AND does things | Built last, on top of a tested, stable system |

We are starting **Phase A — testing — right now**, because that's what's on a
deadline and what you need solid before talking to Joe.

---

## 3. PHASE A — The Master Testing Checklist

Tested in **priority tiers**. We work top-down. A tier isn't "done" until every
box is ticked. I (Jacky) can drive most of these myself in the browser and
report what passes/fails; you spot-check the few that need a human eye.

### TIER 1 — THE SPINE (test first — the business stops without these)
- [ ] **Logins & roles** — owner, manager, coach, support, parent each log in
      and see only what they should
- [ ] **Students / families** — data is correct, searchable, editable; no
      duplicates; 187 students all present
- [ ] **Classes & schedule** — every class shows correct day/time/coach/venue
- [ ] **The roll** — coach can mark attendance; it saves; support-needs flag shows
- [ ] **StarBand check-in / check-out** — scan works, time logs correctly
- [ ] **Parent safety text** — check-in/out fires the SMS (needs ClickSend funds)
- [ ] **Payments / memberships** — active members show, fees correct, Stripe synced

### TIER 2 — DAILY OPERATIONS
- [ ] **Reception Till / POS** — add a sale, take payment, record it
- [ ] **Rewards / Stars** — awarding stars works, tiers calculate
- [ ] **Coach confirm view** — coach confirms the roll cleanly
- [ ] **Team management** — add / remove / assign classes / set passwords
- [ ] **Compliance tiles** — staff briefing, logbook, TFN/ABN docs open + print
- [ ] **Coaching Hub** — academy, pay tiers, coach pay & tax fields save

### TIER 3 — GROWTH & LEADS
- [ ] **Leads & Pipeline (Kanban)** — drag a lead across stages, it saves
- [ ] **Forms** — build a form, it appears on the public link, submit works
- [ ] **Form submissions & analytics** — answers land, QR works, notification fires
- [ ] **Companies** — 89 imported agencies/cares present and tidy
- [ ] **MRR / Finance dashboard** — numbers reconcile with reality
- [ ] **Holiday-workshop booking** — a parent can book a workshop

### TIER 4 — NEW / FRANCHISE / ADVANCED
- [ ] **Branding** — logo, location, owner name editable in Settings, shows top-left
- [ ] **New-Franchise Setup Wizard** — spin up a fresh franchise start-to-finish
- [ ] **Parent portal link (BigStar Kids)** — paid member gets in, non-member bounced
- [ ] **Email sending (Resend)** — a real email goes out and arrives
- [ ] **Automations (n8n)** — once Phase B is built

### Where we START: **Tier 1, box 1 — Logins & roles.**
Everything else sits on top of "the right person sees the right thing." If that's
solid, we move down the list module by module.

---

## 4. PHASE B — Central Hive (franchise-ready automation)

- **You (the franchisor) own ONE n8n.** Every franchise's CRM sends it events
  tagged with which franchise they are.
- Franchisees never log into n8n — they just get working automations.
- First automation to build & test: **new lead → welcome message → 2-day nudge.**
- CRM side: a configurable "automation webhook" per franchise + event-firing on
  key actions (new lead, trial booked, member joined). Franchise-safe.

---

## 5. PHASE C — Jacky-in-the-CRM (the Jarvis brain)

The headline feature. A chat panel built **into** the CRM where the owner/admin
talks to Jacky and she:
- **Answers** ("how many active members do I have?") — reads live CRM data.
- **Guides** ("here's where that's kept, here's how it's done").
- **Does** ("set up an email sequence for new leads") — actually performs it.

This is built with Claude wired into the CRM's own controls. It is genuinely
achievable — and it's built **last**, on a tested, stable base, so it never
trips over a bug and always looks brilliant. *(The OS-level voice attempt this
morning was the wrong approach — clunky. Built-into-the-app is the right way.)*

---

## ✅ TEST RESULTS — 2026-06-09 (full sweep, all tiers PASSED)

Jacky drove the entire live CRM in a browser. Result: **all four tiers pass.**

- **Tier 1 (spine):** logins & roles (incl. URL-security), students/families,
  classes, the roll, StarBand kiosk, finance/Stripe — ALL PASS.
- **Tier 2 (daily ops):** POS/till, rewards (Canva), team management,
  compliance pack, coaching hub — ALL PASS.
- **Tier 3 (growth):** leads pipeline, forms (builder + public), MRR, holiday
  workshops, 89 companies — ALL PASS.
- **Tier 4 (franchise):** branding/settings, 5-step Setup Wizard, email (Resend)
  + SMS (ClickSend) — PASS. **Live test email sent AND received 2026-06-09.** ✅

**Fixed/cleaned this session:** roll-page date bug; 51 families + 16 students
re-capitalised (NDIS/OT tags preserved); 11 duplicate families safely merged
(zero students lost — students/subscriptions repointed before delete); POS
Casual Class $25 → $37.

**Outstanding = data-entry / hardware / decisions, NOT broken code:**
1. ClickSend funds + physical wristbands → switch on safety texts.
2. Blue Card / First Aid / birthdays → fill in (compliance).
3. 8 active members → record their weekly fee.
4. Parent-portal paid-member gate → live test with a real parent (Oct cutover).

**Phase A (Harden & Test) is effectively DONE — ahead of the 12 July deadline.**
Next: Phase B (central Hive automation), then Phase C (Jacky-as-Jarvis).

## 6. The Joe Conversation

Before involving Joe: **finish Tier 1 + Tier 2 testing** so you can show him a
CRM that demonstrably works, not a promise. Walk in with this document + a
green-ticked checklist. Strength = proof.
