// SMTP sender for admin@bigstarcircus.com.au.
// Uses Titan Email's SMTP server (smtp.titan.email:465).

import nodemailer from 'nodemailer'
import { config } from '../config.js'
import { logger } from '../logger.js'

const transporter = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: true,
  auth: { user: config.email.smtp.user, pass: config.email.smtp.password },
})

export async function sendEmail(input: {
  to: string
  subject: string
  bodyText: string
  bodyHtml?: string
  inReplyTo?: string
  references?: string[]
  cc?: string
  bcc?: string
}): Promise<{ ok: true; messageId: string } | { ok: false; error: string }> {
  if (config.dryRun) {
    logger.warn({ to: input.to, subject: input.subject }, 'DRY RUN — skipping actual send')
    return { ok: true, messageId: 'dry-run' }
  }

  try {
    const info = await transporter.sendMail({
      from: `${config.email.fromName} <${config.email.fromEmail}>`,
      to: input.to,
      cc: input.cc,
      bcc: input.bcc,
      subject: input.subject,
      text: input.bodyText,
      html: input.bodyHtml,
      inReplyTo: input.inReplyTo,
      references: input.references?.join(' '),
      headers: {
        'X-Jacky-Source': 'server-jacky/0.1',
      },
    })

    logger.info({ to: input.to, subject: input.subject, messageId: info.messageId }, 'Email sent')
    return { ok: true, messageId: info.messageId }
  } catch (e) {
    const msg = (e as Error).message
    logger.error({ err: msg, to: input.to, subject: input.subject }, 'Email send failed')
    return { ok: false, error: msg }
  }
}

export async function testSmtpConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    await transporter.verify()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
