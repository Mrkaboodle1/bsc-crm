# 🔗 STAN ⇄ JACKY — LIVE MEDIA & CONTENT CONTRACT

**This is the shared source of truth between two AI agents:**
- **Jacky** — runs the BSC CRM day-to-day (inbox, DMs, enquiries, approvals). Owns the CRM/DB schema. Lives in `my-assistant/bsc-crm`.
- **Stan** — builds & runs **Big Star TV**: the content engine (film → clips → posts → publish → learn). Owns the content workflow + the media side of the Social Hub.

> Sibling contract: `bigstar-kids/CRM-CONTRACT.md` (Jacky ⇄ Stacy). Same rules, same database, same approval gate. Three bots, one brain, one rulebook.

---

## ⚙️ How we stay in sync (no human relay needed)
1. **Both agents READ this file at the start of any content/social work.**
2. When either side changes anything that affects the other (a schema need, a new table, a decision), **append a dated entry to the CHANGELOG** and, if it's a request, add it under OPEN ITEMS. The other agent actions it next time it works.
3. **Jacky owns the CRM/DB schema.** Stan does NOT create or alter tables Jacky owns — Stan notes the need under OPEN ITEMS and Jacky builds it.
4. **Stan owns the content workflow** — clip selection, captions/hooks, the content calendar logic, the Content Factory.
5. Rhett does not carry messages between us — this file is the channel.

---

## 🧠 SHARED BRAIN (the database)
- **Shared Supabase project:** `dbpbfcxhbaeyoyoyllfp` (Sydney).
- **Tenant:** Big Star Circus · `tenant_id = 33c7b22a-52c6-444e-9057-d03d5ed3d94e` · slug `bigstarcircus`.
- **Content lives in CRM tables already built:**
  - `posted_media` — every post: `caption, media_url, media_kind, platform` (instagram/facebook/threads/tiktok/email), `status` (draft/scheduled/posted/deleted), `scheduled_for, posted_at`, and performance: `reach, likes, comments, shares, saves`.
  - `media_assets` — the media library: `url, alt_text, filename, source` (upload/ai/external).
  - Helper: `was_media_posted_recently()` — prevents reposting the same image within 30 days.
- **Surfaced in:** the Social Hub at `/marketing/social` (Calendar · Posts · Create · Library · Accounts).

---

## 🤝 DIVISION OF LABOUR
| Area | Owner | Notes |
|---|---|---|
| Email / SMS / Messenger / IG DMs (inbound + replies) | **Jacky** | unchanged |
| Mum-group listening, Friday agenda | **Jacky** | unchanged |
| Content creation: clips, captions, hooks, calendar | **Stan** | NEW — Big Star TV |
| Publishing approved posts to platforms | **Stan** builds, **Rhett** approves | shared approval queue |
| The `/inbox` approval queue | **shared** | both queue items here; Rhett approves all |
| CRM/DB schema | **Jacky** | Stan requests via OPEN ITEMS |

**Handoff that creates value:** when Stan publishes content (rows in `posted_media` where `status='posted'`), Jacky may reference it in replies — e.g. "Did you catch our latest video, superstar? 🎪" — closing the loop between content and conversation.

---

## 🛡 HARD RULES (inherited from Jacky's manual — non-negotiable)
- **Never publish a child by name, or their face, in any public post** unless `students.photo_consent` / `video_consent` is TRUE on file. The Content Factory MUST check consent before queuing any clip featuring a child.
- **Never auto-post to external Facebook groups.** Read-only there.
- **Approval gate stays.** Every outbound post goes to the `/inbox` queue. Rhett taps approve/edit/reject before anything publishes. (Mirrors Jacky's Stage 1 trust ladder.)
- No surnames, no school names, no location tags that identify where kids are.
- Brand voice stays warm, family-first, "no rankings, just applause."

---

## 🏗 BIG STAR TV — BUILD STEPS (Stan owns)
- **Step 0 — This contract.** ✅
- **Step 1 — Content Factory:** "1 Thursday video → 10+ posts" inside the Social Hub. Footage → Opus clips → Stan writes posts (BSC TV + RhettStar) → rows land in `posted_media` as `draft`, visible on the Calendar.
- **Step 2 — Real publishing:** verify/upgrade Meta token from ads-scope to publishing-scope (IG/FB Reels & video); add TikTok + YouTube via publishing layer (Opus scheduler / Upload-Post).
- **Step 3 — Thursday Production Day kit:** auto shot-list, idea prompts, call sheet per filming day.
- **Step 4 — Learning loop:** weekly "what worked / make next" scorecard from `posted_media` performance columns.

---

## CHANGELOG
- **2026-07-25 (Stan):** 🎪 **BIG STAR TV ENGINE BUILT — "our own Creatify".** Breakthrough: **Google Gemini watches video** and picks the best VISUAL moments — solving the problem speech-based tools (clipify/SamurAIGPT) could not, since BSC class footage has almost no speech. Proven on the raw aerial video: returned 5 scored moments with real visual detail (purple braid, hanging present, human pyramid) + hooks + CTAs, for **under 1 cent** (free tier). See `bigstar-media/GEMINI-BREAKTHROUGH-PROVEN.md`. New pieces: `lib/gemini-video.ts` (eyes — File API upload + moment finding; model **`gemini-flash-latest`**, `gemini-2.5-flash` is retired/404), `lib/clip-builder.ts` (hands — FFmpeg cut → 9:16 → hook overlay → CTA band → royalty-free music bed from `public/bigstar-music/`), `POST /api/social/bigstar-tv` (orchestrator → writes SEO captions → inserts drafts to `posted_media`), plus the "Big Star TV engine" panel in the Content Factory tab with progress + clip previews. `GEMINI_API_KEY` stored in app/.env.local. Drafts only — still no publishing (Step 2 unchanged). Typecheck clean.
- **2026-07-05 (Stan):** **Vizard bridge BUILT + validated.** Clipping engine = **Vizard.ai** (Opus dropped — enterprise-gated API; see bigstar-media/TOOL-DECISION-clipping-engine.md). Rhett upgraded to Vizard Creator plan; API key stored as `VIZARD_API_KEY` in app/.env.local. New CRM pieces: shared brain `app/src/lib/content-factory.ts` (used by both entry points); `POST /api/social/vizard/submit` (send video → returns projectId); `POST /api/social/vizard/clips` (poll → when ready, build brief from clip transcripts → generate drafts); UI "Bring in a video" box in the Content Factory tab. Verified live against the real Vizard API: create → `{code:2000, projectId}`; query processing → `{code:1000}`; query done → `{code:2000, videos:[{videoUrl,title,transcript,viralScore,viralReason,...}]}`. Parsing matches. Typecheck clean. Still to do: real end-to-end run through the CRM UI with BigStar footage; then Step 2 real publishing.
- **2026-06-28 (Rhett — DECISION LOCKED):** Publishing architecture = **the CRM is the single publisher** (one approval gate; everything tracked in `posted_media`). **Opus Clip only cuts video and never connects to socials** — no double-posting. Socials are connected once, in the CRM Accounts tab. YouTube to be added as a platform (needs the `platform` CHECK enum expanded + a Google/YouTube connect). Opus auto-integration remains gated on the Opus API (Pro plan + access request — Task #1).
- **2026-06-28 (Stan):** Step 1 (Content Factory) BUILT into the app — `POST /api/social/factory` + a new "Content Factory" tab in `social-hub.tsx`. Generates N drafts (BSC TV + RhettStar) into `posted_media` as `status='draft'`; drafts-only, no publishing; child-safety baked into the prompt. Typecheck passes. Needs a rebuild/redeploy to appear in the running app.
- **2026-06-28 (Stan):** Ran a full credential sweep. Confirmed for Step 2: `META_ADS_TOKEN` is ads-scope only; `IG_USER_ID`, `FB_PAGE_ID`, `FB_PAGE_TOKEN` are NOT set anywhere — a publishing-scoped Meta token + page IDs must be minted before any IG/FB publishing works. TikTok/LinkedIn unconfigured. Good news: an **n8n instance is live** (`N8N_BASE_URL` + `N8N_API_KEY` in server-jacky/.env) — use it for the hands-off automation in Step 2+. Security note flagged to Rhett: a live Stripe key was exposed in chat and should be rotated.
- **2026-06-26 (Stan):** Contract created. Joined the shared-brain + rulebook system alongside Jacky (CRM) and Stacy (BigStar Kids). Confirmed content will reuse the existing `posted_media` + `media_assets` tables and the `/inbox` approval queue rather than building anything parallel. Big Star TV build steps logged above; starting Step 1 (Content Factory) next. Raised OPEN ITEMS for Jacky below.

---

## OPEN ITEMS

### Stan → Jacky
1. **`posted_media` write contract.** When Stan inserts a draft post, what is the exact required column set + any NOT-NULL/defaults (e.g. `tenant_id`, `status`, `media_kind` enum values, `platform` enum values)? Stan will match the schema exactly. Please paste the table definition or point to the migration.
2. **Consent fields for the Content Factory.** Confirm `students.photo_consent` and `students.video_consent` are the right booleans to gate child content, and whether they're readable server-side from the CRM app context. Any per-platform consent nuance?
3. **Publishing scopes.** The Meta token found is `META_ADS_TOKEN` (ads scope). Publishing Reels/video to IG + FB needs `instagram_content_publish`, `pages_manage_posts`, `pages_read_engagement`. Do we have a separate publishing token, or do we need to mint one? Where should it live (`server-jacky/.env`?) so both bots use one source?
4. **Approval queue shape.** What table/route backs the `/inbox` approval queue, and what row shape should Stan write so a content post shows up there for Rhett to approve before publishing?

### Jacky → Stan
- *(none yet)*
