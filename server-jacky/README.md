# Server-Jacky

The BSC AI Admin Agent — Node.js process running on the BSC VPS.

Runs every 15 minutes, reads admin@bigstarcircus.com.au inbox via IMAP,
drafts replies using Claude, pushes drafts to the BSC CRM `pending_actions`
table. Rhett approves from his phone via the `/inbox` page in the CRM.

---

## Local dev

```bash
cd server-jacky
npm install
cp .env.example .env
# Fill in .env with the real keys (Anthropic, admin@ Titan password, Supabase service role key)

# Smoke tests
npm run test:claude   # verifies Anthropic API key
npm run test:imap     # verifies admin@ IMAP login
npm run test:smtp     # verifies admin@ SMTP login (no actual send)

# One-shot triage
npm run triage

# Long-running with cron (every 15 min)
npm run dev           # tsx watch mode
```

## Deploy to the VPS

Assumes you've SSH'd into the box and you've already got Node 20 installed
(Sir Cash A Lot's setup already did this).

```bash
# From local machine — push code
ssh -i ~/.ssh/sircashalot root@134.199.155.47 'mkdir -p /opt/jacky'
rsync -avz --exclude node_modules --exclude dist --exclude .env \
  -e "ssh -i ~/.ssh/sircashalot" \
  server-jacky/ root@134.199.155.47:/opt/jacky/

# SSH in and install
ssh -i ~/.ssh/sircashalot root@134.199.155.47
cd /opt/jacky
npm install
npm run build

# Copy .env (after filling in the secrets locally first)
# On local:
scp -i ~/.ssh/sircashalot server-jacky/.env root@134.199.155.47:/opt/jacky/.env

# Install systemd unit
cp jacky-bsc.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable jacky-bsc
systemctl start jacky-bsc

# Watch logs
journalctl -u jacky-bsc -f
# or
tail -f /var/log/jacky-bsc.log
```

## Required env vars

See `.env.example`. Critical ones:

- `ANTHROPIC_API_KEY` — from console.anthropic.com
- `ADMIN_IMAP_PASSWORD` + `ADMIN_SMTP_PASSWORD` — Titan password for admin@
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings → API
- `JACKY_STAGE` — 1 = drafts only, 2 = auto-reply on known patterns, 3 = fully autonomous

## Operating routines (cron schedule)

| Schedule | Routine | What it does |
|---|---|---|
| Every 15 min | `triage_inbox` | Read unseen emails, classify, draft replies, push to approval queue |
| 07:30 daily (Brisbane) | `morning_summary` | (TODO) Email Rhett a digest of last 24h: drafts pending, new leads, etc. |

## Stage gates

- **Stage 1 (current):** Every draft goes to `pending_actions` with `status = 'pending'`. Rhett approves before send.
- **Stage 2:** Auto-reply on known patterns (FAQ, trial confirmations). Everything else still drafted.
- **Stage 3:** Fully autonomous, escalates only exceptions.

Set `JACKY_STAGE=N` in `.env`.
