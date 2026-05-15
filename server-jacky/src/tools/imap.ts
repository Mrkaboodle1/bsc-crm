// IMAP reader for admin@bigstarcircus.com.au.
// Uses ImapFlow + mailparser. Connects to Titan Email's IMAP (imap.titan.email:993).
//
// Strategy: every triage run we fetch unread emails from INBOX since the last
// run, parse them, and return a normalised list of ParsedEmail objects.

import { ImapFlow } from 'imapflow'
import { simpleParser, type ParsedMail } from 'mailparser'
import { config } from '../config.js'
import { logger } from '../logger.js'

export type ParsedEmail = {
  uid: number
  messageId: string
  inReplyTo: string | null
  references: string[]
  fromEmail: string
  fromName: string | null
  toEmails: string[]
  ccEmails: string[]
  subject: string | null
  bodyText: string | null
  bodyHtml: string | null
  hasAttachments: boolean
  attachmentNames: string[]
  receivedAt: Date
  headers: Record<string, string>
}

export async function fetchUnreadEmails(options?: {
  limit?: number
  markRead?: boolean
}): Promise<ParsedEmail[]> {
  const limit = options?.limit ?? 25
  const client = new ImapFlow({
    host: config.email.imap.host,
    port: config.email.imap.port,
    secure: true,
    auth: { user: config.email.imap.user, pass: config.email.imap.password },
    logger: false,
  })

  await client.connect()
  const results: ParsedEmail[] = []

  try {
    const lock = await client.getMailboxLock('INBOX')
    try {
      // Find unseen UIDs
      const uids = await client.search({ seen: false }, { uid: true })
      if (!uids || uids.length === 0) {
        logger.info('No unread emails in INBOX')
        return []
      }
      // Newest first, cap at limit
      const target = uids.slice(-limit).reverse()
      logger.info(`Fetching ${target.length} unread email${target.length === 1 ? '' : 's'}`)

      for (const uid of target) {
        const msg = await client.fetchOne(`${uid}`, { source: true, envelope: true, uid: true }, { uid: true })
        if (!msg || !msg.source) continue

        const parsed = await simpleParser(msg.source)
        const normalised = normalise(parsed, msg.uid ?? uid)
        results.push(normalised)

        // Optionally mark seen so we don't process again
        if (options?.markRead) {
          await client.messageFlagsAdd(`${uid}`, ['\\Seen'], { uid: true })
        }
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => {})
  }

  return results
}

function normalise(parsed: ParsedMail, uid: number): ParsedEmail {
  const fromAddr = parsed.from?.value?.[0]
  const toAddrs = parsed.to ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to]) : []
  const ccAddrs = parsed.cc ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc]) : []
  const toEmails = toAddrs.flatMap((a) => a.value?.map((v) => v.address ?? '').filter(Boolean) ?? [])
  const ccEmails = ccAddrs.flatMap((a) => a.value?.map((v) => v.address ?? '').filter(Boolean) ?? [])

  const headersRecord: Record<string, string> = {}
  parsed.headerLines.forEach((h) => {
    headersRecord[h.key.toLowerCase()] = h.line
  })

  return {
    uid,
    messageId: parsed.messageId ?? `<no-id-${uid}-${Date.now()}@bigstarcircus.com.au>`,
    inReplyTo: typeof parsed.inReplyTo === 'string' ? parsed.inReplyTo : null,
    references: Array.isArray(parsed.references)
      ? parsed.references
      : parsed.references
      ? [parsed.references]
      : [],
    fromEmail: fromAddr?.address ?? '',
    fromName: fromAddr?.name ?? null,
    toEmails,
    ccEmails,
    subject: parsed.subject ?? null,
    bodyText: parsed.text ?? null,
    bodyHtml: typeof parsed.html === 'string' ? parsed.html : null,
    hasAttachments: (parsed.attachments?.length ?? 0) > 0,
    attachmentNames: (parsed.attachments ?? []).map((a) => a.filename ?? 'attachment').filter(Boolean),
    receivedAt: parsed.date ?? new Date(),
    headers: headersRecord,
  }
}

/** Quick health check: try to connect, get INBOX status, then disconnect. */
export async function testImapConnection(): Promise<{ ok: boolean; messageCount: number; unseenCount: number; error?: string }> {
  const client = new ImapFlow({
    host: config.email.imap.host,
    port: config.email.imap.port,
    secure: true,
    auth: { user: config.email.imap.user, pass: config.email.imap.password },
    logger: false,
  })
  try {
    await client.connect()
    const mailbox = await client.mailboxOpen('INBOX')
    const messageCount = mailbox.exists
    const status = await client.status('INBOX', { unseen: true })
    const unseenCount = status.unseen ?? 0
    await client.mailboxClose()
    await client.logout()
    return { ok: true, messageCount, unseenCount }
  } catch (e) {
    return { ok: false, messageCount: 0, unseenCount: 0, error: (e as Error).message }
  }
}
