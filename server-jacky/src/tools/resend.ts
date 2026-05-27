// Resend.com transactional email sender for admin@bigstarcircus.com.au.
// Uses the Resend HTTP API directly (no SDK — keeps deps lean).
//
// Why Resend: Titan SMTP rejected our credentials four different ways,
// Microsoft Graph can only send AS rhettbigstar@hotmail.com, and we want
// the visible From to be admin@bigstarcircus.com.au with proper DKIM/SPF.
// Resend ticks all of those + free 3000 emails/month + simple API.

import { logger } from '../logger.js'

const RESEND_API = 'https://api.resend.com'

type ResendSendResponse = {
  id?: string
  message?: string
  name?: string
}

export async function sendEmail(input: {
  to: string
  subject: string
  bodyText: string
  bodyHtml?: string
  inReplyTo?: string
  references?: string[]
  cc?: string
  bcc?: string
  replyTo?: string
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY not set' }
  }

  // Defence in depth: Resend rejects with HTTP 422 "Missing html or text"
  // when both are empty. Catch this here so the caller gets a clear error
  // instead of an opaque API failure.
  if (!input.bodyText?.trim() && !input.bodyHtml?.trim()) {
    return { ok: false, error: 'Email body is empty — refusing to send a blank message' }
  }

  const fromEmail = process.env.ADMIN_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const fromName = process.env.ADMIN_FROM_NAME || 'Jacky · Big Star Circus'
  const replyTo = input.replyTo || fromEmail

  // Build RFC headers for proper threading
  const headers: Record<string, string> = {
    'X-Jacky-Source': 'server-jacky/0.1',
  }
  if (input.inReplyTo) headers['In-Reply-To'] = input.inReplyTo
  if (input.references && input.references.length > 0) {
    headers['References'] = input.references.join(' ')
  }

  const payload: Record<string, unknown> = {
    from: `${fromName} <${fromEmail}>`,
    to: [input.to],
    subject: input.subject,
    text: input.bodyText,
    headers,
    reply_to: replyTo,
  }
  if (input.bodyHtml) payload.html = input.bodyHtml
  if (input.cc) payload.cc = [input.cc]
  if (input.bcc) payload.bcc = [input.bcc]

  try {
    const res = await fetch(`${RESEND_API}/emails`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const data = (await res.json()) as ResendSendResponse
    if (!res.ok) {
      const errMsg = data.message || data.name || `${res.status}`
      logger.error({ err: errMsg, to: input.to }, '❌ Resend send failed')
      return { ok: false, error: `Resend ${res.status}: ${errMsg}` }
    }
    if (!data.id) {
      return { ok: false, error: `Resend returned no id: ${JSON.stringify(data)}` }
    }
    logger.info({ to: input.to, subject: input.subject, messageId: data.id }, '✅ Email sent via Resend')
    return { ok: true, messageId: data.id }
  } catch (e) {
    const msg = (e as Error).message
    logger.error({ err: msg, to: input.to }, '❌ Resend request failed')
    return { ok: false, error: msg }
  }
}

/** Quick health probe. Sends a request to /domains to verify the API key works. */
export async function testResendConnection(): Promise<{ ok: boolean; error?: string; domains?: string[] }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not set' }
  try {
    const res = await fetch(`${RESEND_API}/domains`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const text = await res.text()
      return { ok: false, error: `Resend /domains ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = (await res.json()) as { data?: Array<{ name: string; status: string }> }
    const domains = (data.data ?? []).map((d) => `${d.name} (${d.status})`)
    return { ok: true, domains }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
