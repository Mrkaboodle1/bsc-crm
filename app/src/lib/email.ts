import 'server-only'

// Minimal Resend email sender (no SDK). Used for auto welcome emails etc.
const KEY = process.env.RESEND_API_KEY
const FROM = `${process.env.RESEND_FROM_NAME || 'BigStar Circus'} <${process.env.RESEND_FROM_EMAIL}>`
const REPLY = process.env.RESEND_REPLY_TO

export function emailConfigured(): boolean {
  return Boolean(KEY && process.env.RESEND_FROM_EMAIL)
}

export async function sendEmail(to: string, subject: string, html: string, tag?: string): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!emailConfigured()) return { ok: false, error: 'email_not_configured' }
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) return { ok: false, error: 'invalid_email' }
  try {
    const body: Record<string, unknown> = { from: FROM, to: [to], subject, html, reply_to: REPLY || undefined }
    // A tag lets the stats view group events by which email/campaign this was.
    if (tag) body.tags = [{ name: 'campaign', value: tag.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40) }]
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const j = await r.json().catch(() => ({}))
    return j?.id ? { ok: true, id: j.id } : { ok: false, error: j?.message || 'http_' + r.status }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
