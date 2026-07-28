// ----------------------------------------------------------------------------
// ClickSend SMS helper (HTTP API, no SDK).
// Used for StarBand parent safety texts and any other tenant SMS.
// Credentials come from env: CLICKSEND_USERNAME, CLICKSEND_API_KEY,
// CLICKSEND_SENDER_ID (optional alphanumeric sender, e.g. "BigStar").
// ----------------------------------------------------------------------------

const USERNAME = process.env.CLICKSEND_USERNAME
const API_KEY = process.env.CLICKSEND_API_KEY
const SENDER = (process.env.CLICKSEND_SENDER_ID || '').trim()

export function smsConfigured(): boolean {
  return Boolean(USERNAME && API_KEY)
}

// Normalise an Australian mobile to E.164 (+61…). Returns null if unusable.
export function normaliseAuPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let s = String(raw).replace(/[^\d+]/g, '')
  if (!s) return null
  if (s.startsWith('+')) return s.length >= 8 ? s : null
  if (s.startsWith('0')) return '+61' + s.slice(1)        // 0489… -> +61489…
  if (s.startsWith('61')) return '+' + s                   // 61489… -> +61489…
  if (s.length === 9) return '+61' + s                     // 489188179 -> +61489188179
  return null
}

export async function sendSms(
  to: string | null | undefined,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!smsConfigured()) return { ok: false, error: 'sms_not_configured' }
  const phone = normaliseAuPhone(to)
  if (!phone) return { ok: false, error: 'invalid_phone' }

  const message: Record<string, string> = { source: 'bsc-crm', to: phone, body }
  if (SENDER) message.from = SENDER

  try {
    const res = await fetch('https://rest.clicksend.com/v3/sms/send', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${USERNAME}:${API_KEY}`).toString('base64'),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [message] }),
    })
    const json: unknown = await res.json().catch(() => ({}))
    const j = (json ?? {}) as { response_msg?: string; data?: { messages?: Array<{ status?: string }> } }
    if (!res.ok) return { ok: false, error: j.response_msg || `http_${res.status}` }
    const first = j.data?.messages?.[0]
    if (first?.status && first.status !== 'SUCCESS') return { ok: false, error: first.status }
    return { ok: true }
  } catch (err) {
    return { ok: false, error: (err as Error).message }
  }
}
