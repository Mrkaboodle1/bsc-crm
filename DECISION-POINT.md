# Decision point — Titan IMAP/SMTP

*15 May 2026 — Jacky on standby*

## Where we are

✅ **Everything works EXCEPT Titan IMAP/SMTP.**

- Anthropic API key: working
- Supabase service-role: working
- DKIM verified
- admin@ webmail login: working
- Migration 006: applied
- Server-Jacky agent code: built + compiles cleanly
- /inbox approval queue page: deployed and live
- Droplet resized to 1GB: ready
- admin@ → rhettbigstar@hotmail.com forwarding: live

❌ **The only blocker: Titan IMAP + SMTP reject auth (535 error).**

Crazy Domains support says 3rd-party access IS enabled. The password works for webmail. But IMAP/SMTP both still reject. This is a Titan-side problem we can't fix from outside.

## Three paths forward

### 🟢 Path A — Pivot to Hotmail-read architecture (RECOMMENDED)

- Drop Titan IMAP entirely.
- Server-Jacky reads `rhettbigstar@hotmail.com` (which receives every admin@ email via the forwarding we set up).
- For sending: Stage 0 = manual paste (Jacky drafts, you tap approve, /inbox copies the draft to your clipboard + opens Titan webmail in a new tab → you paste + send).
- Stage 1 (next week): Resend SMTP for autonomous sending. Bypasses Titan entirely.

**Cost:** ~20 min refactor on my end. Zero setup from Rhett today.
**Result:** Jacky reads + drafts TODAY. Auto-send next week.

### 🟡 Path B — Try webmail logout/login first

- Rhett logs out of Titan webmail, logs back in with the password from jacky-secrets.txt.
- If webmail login still works → confirms password is right → Titan has a real backend bug → Path A.
- If webmail rejects → the saved password is wrong → reset once more, save carefully, re-test.

**Cost:** 30 seconds.
**Result:** Confirms which side the bug is on.

### 🔴 Path C — Keep fighting Titan (NOT RECOMMENDED)

- Contact Titan directly (Crazy Domains may not have actually escalated to Titan's team).
- Open a Titan support ticket via support.titan.email.
- Wait 24-48 hrs for a real response.

**Cost:** Days of waiting.
**Result:** Possibly nothing.

## My recommendation

**Path B first (30 seconds to confirm), then Path A immediately (regardless of result).**

The forward-path was always going to be the more robust architecture anyway. Titan being awkward is just nudging us there sooner. Long term, we want Resend as our outbound provider — better deliverability, better tooling, and no Titan dependence.

---

🎪 — Jacky
