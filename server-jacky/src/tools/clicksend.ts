// ClickSend SMS sender for Big Star Circus.
// Outbound only for now — uses alphanumeric sender ID "BigStar" so the From
// line on the customer's phone reads "BigStar" instead of a random shared
// number. Inbound polling can be added later if BSC buys a dedicated number.

import { logger } from '../logger.js'

const API = 'https://rest.clicksend.com/v3'

function basicAuth(): string {
  const user = process.env.CLICKSEND_USERNAME
  const key = process.env.CLICKSEND_API_KEY
  if (!user || !key) throw new Error('CLICKSEND_USERNAME or CLICKSEND_API_KEY not set')
  return 'Basic ' + Buffer.from(`${user}:${key}`).toString('base64')
}

/** Normalise an Australian mobile number to E.164. */
export function normaliseAuMobile(input: string): string | null {
  const digits = input.replace(/\D+/g, '')
  if (digits.length === 10 && digits.startsWith('04')) return '+61' + digits.slice(1)
  if (digits.length === 11 && digits.startsWith('614')) return '+' + digits
  if (digits.length === 9 && digits.startsWith('4')) return '+61' + digits
  if (input.startsWith('+61')) return input.replace(/\s+/g, '')
  return null
}

/** Send a single SMS via ClickSend. Returns the message_id from ClickSend's response. */
export async function sendSms(input: {
  to: string
  body: string
  senderId?: string // alphanumeric (max 11 chars) or a verified number
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const to = normaliseAuMobile(input.to) || input.to
  const from = input.senderId ?? process.env.CLICKSEND_SENDER_ID ?? 'BigStar'

  const payload = {
    messages: [
      {
        source: 'jacky-server',
        from,
        to,
        body: input.body,
      },
    ],
  }

  try {
    const res = await fetch(`${API}/sms/send`, {
      method: 'POST',
      headers: {
        Authorization: basicAuth(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = (await res.json()) as {
      http_code: number
      response_code: string
      response_msg: string
      data?: { messages?: Array<{ message_id: string; status: string }> }
    }
    if (data.http_code !== 200 || data.response_code !== 'SUCCESS') {
      const msg = `${data.response_code}: ${data.response_msg}`
      logger.error({ err: msg, to }, '❌ ClickSend send failed')
      return { ok: false, error: msg }
    }
    const msgId = data.data?.messages?.[0]?.message_id ?? `cs-${Date.now()}`
    logger.info({ to, messageId: msgId, from }, '✅ SMS sent via ClickSend')
    return { ok: true, messageId: msgId }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Quick health probe. Returns the account balance and country. */
export async function testClickSendConnection(): Promise<{ ok: boolean; balance?: number; country?: string; error?: string }> {
  try {
    const res = await fetch(`${API}/account`, { headers: { Authorization: basicAuth() } })
    const data = (await res.json()) as { http_code: number; data?: { balance: string; country: string } }
    if (data.http_code !== 200) return { ok: false, error: `HTTP ${data.http_code}` }
    return { ok: true, balance: Number(data.data?.balance ?? 0), country: data.data?.country }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
