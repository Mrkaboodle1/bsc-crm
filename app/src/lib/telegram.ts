import 'server-only'

// Telegram alerts to the owner's phone. Used by the booking-watcher cron.
// Token + chat id live in env (TELEGRAM_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID).
const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const CHAT = process.env.TELEGRAM_ALERT_CHAT_ID

export function telegramConfigured(): boolean {
  return Boolean(TOKEN && CHAT)
}

// Escape the five characters that matter for Telegram HTML parse mode.
export function tgEscape(s: unknown): string {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Send one HTML message to the owner. Never throws — a failed ping must not break
// the cron, so we return {ok,error} and let the caller carry on.
export async function sendTelegram(html: string): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN || !CHAT) return { ok: false, error: 'telegram not configured' }
  try {
    const r = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: CHAT, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
    })
    const d = await r.json().catch(() => ({}))
    return d?.ok ? { ok: true } : { ok: false, error: d?.description || `http ${r.status}` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
