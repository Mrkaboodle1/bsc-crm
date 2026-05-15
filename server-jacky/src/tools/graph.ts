// Microsoft Graph + MSAL device-code-flow client.
// Reads rhettbigstar@hotmail.com inbox (where admin@bigstarcircus.com.au
// forwards land) via Microsoft Graph API. Avoids Titan IMAP entirely.
//
// First run: device code flow — user goes to a URL on their phone, types a
// short code, grants access. Subsequent runs use the refresh token stored
// in a local JSON file.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-node'
import { config } from '../config.js'
import { logger } from '../logger.js'

const CLIENT_ID = process.env.GRAPH_CLIENT_ID || '183c8ce3-180d-4a4c-b546-29baf38d6e17'
const AUTHORITY = process.env.GRAPH_AUTHORITY || 'https://login.microsoftonline.com/common'
const SCOPES = ['Mail.Read', 'Mail.ReadWrite', 'Mail.Send', 'offline_access']
const TOKEN_CACHE_PATH = process.env.GRAPH_TOKEN_CACHE
  || path.join(process.env.HOME || process.env.USERPROFILE || '.', '.jacky-graph-tokens.json')

const pca = new PublicClientApplication({
  auth: { clientId: CLIENT_ID, authority: AUTHORITY },
  cache: {
    cachePlugin: {
      beforeCacheAccess: async (ctx) => {
        try {
          const txt = await fs.readFile(TOKEN_CACHE_PATH, 'utf8')
          ctx.tokenCache.deserialize(txt)
        } catch {
          // No cache yet — fine.
        }
      },
      afterCacheAccess: async (ctx) => {
        if (ctx.cacheHasChanged) {
          await fs.writeFile(TOKEN_CACHE_PATH, ctx.tokenCache.serialize(), 'utf8')
        }
      },
    },
  },
})

/** Get an access token. Triggers device code flow on first run, silent refresh after. */
export async function getAccessToken(opts?: { onDeviceCode?: (msg: string) => void }): Promise<string> {
  // 1. Try silent acquisition (uses refresh token from cache)
  const cache = pca.getTokenCache()
  const accounts = await cache.getAllAccounts()
  if (accounts.length > 0) {
    try {
      const result = await pca.acquireTokenSilent({
        account: accounts[0]!,
        scopes: SCOPES,
      })
      if (result?.accessToken) return result.accessToken
    } catch (e) {
      logger.warn({ err: (e as Error).message }, 'Silent token refresh failed; falling back to device code')
    }
  }

  // 2. Fall back to device code flow
  const result = await pca.acquireTokenByDeviceCode({
    scopes: SCOPES,
    deviceCodeCallback: (response) => {
      const msg = response.message
      logger.info('\n' + '='.repeat(60) + '\n' + msg + '\n' + '='.repeat(60) + '\n')
      if (opts?.onDeviceCode) opts.onDeviceCode(msg)
      else console.log('\n' + msg + '\n')
    },
  }) as AuthenticationResult | null
  if (!result?.accessToken) throw new Error('Device code flow returned no token')
  return result.accessToken
}

/** Returns the signed-in account (after token acquired). */
export async function getAccount(): Promise<AccountInfo | null> {
  const accounts = await pca.getTokenCache().getAllAccounts()
  return accounts[0] ?? null
}

// ────────────────────────────────────────────────────────────────────
// Microsoft Graph wrapper
// ────────────────────────────────────────────────────────────────────

const GRAPH = 'https://graph.microsoft.com/v1.0'

async function graphFetch<T = unknown>(method: 'GET' | 'POST' | 'PATCH' | 'DELETE', urlPath: string, body?: unknown, extraHeaders?: Record<string, string>): Promise<T> {
  const token = await getAccessToken()
  const url = urlPath.startsWith('http') ? urlPath : `${GRAPH}${urlPath}`
  const res = await fetch(url, {
    method,
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(extraHeaders ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Graph ${method} ${urlPath} failed: ${res.status} ${text.slice(0, 400)}`)
  }
  if (res.status === 204) return undefined as T
  const json = await res.json() as T
  return json
}

export type GraphEmail = {
  id: string
  internetMessageId: string
  conversationId: string
  subject: string | null
  from: { emailAddress: { address: string; name?: string } } | null
  toRecipients: Array<{ emailAddress: { address: string; name?: string } }>
  ccRecipients: Array<{ emailAddress: { address: string; name?: string } }>
  receivedDateTime: string
  hasAttachments: boolean
  body: { contentType: 'text' | 'html'; content: string }
  bodyPreview: string
  isRead: boolean
  flag?: { flagStatus: string }
  internetMessageHeaders?: Array<{ name: string; value: string }>
}

const ADMIN_INBOX = process.env.JACKY_INBOX_ADDRESS || 'admin@bigstarcircus.com.au'

// Ask Graph to return body content as plain text (auto-stripped from HTML).
// Per MS docs: https://learn.microsoft.com/en-us/graph/api/message-get
const PREFER_TEXT_BODY = { Prefer: 'outlook.body-content-type="text"' }

/** Read unread emails from the user's inbox. */
export async function readUnread(limit: number = 25): Promise<GraphEmail[]> {
  // internetMessageHeaders is only returned when explicitly $select'd
  const select = 'id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,body,bodyPreview,isRead,internetMessageHeaders'
  const url = `/me/mailFolders/Inbox/messages?$filter=isRead eq false&$top=${limit}&$orderby=receivedDateTime desc&$select=${select}`
  const resp = await graphFetch<{ value: GraphEmail[] }>('GET', url, undefined, PREFER_TEXT_BODY)
  return resp.value
}

/**
 * Read recent emails that were originally sent to admin@bigstarcircus.com.au
 * (i.e. forwarded into this Hotmail inbox). This is the right source for Jacky
 * because rhettbigstar@hotmail.com also receives plenty of personal mail.
 *
 * sinceHours defaults to 72h. Dedup at the email_messages table layer handles
 * the case where the same admin@ email is fetched twice.
 */
export async function readAdminInbox(opts: { sinceHours?: number; limit?: number } = {}): Promise<GraphEmail[]> {
  const sinceHours = opts.sinceHours ?? 72
  const limit = opts.limit ?? 50
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000).toISOString()
  const select = 'id,internetMessageId,conversationId,subject,from,toRecipients,ccRecipients,receivedDateTime,hasAttachments,body,bodyPreview,isRead,internetMessageHeaders'
  // Personal MSA accounts reject lambda filters on collection navigation properties,
  // so we fetch by date only and filter recipients client-side. We over-fetch by 4×
  // and cap to `limit` after filtering.
  const fetchN = Math.min(limit * 4, 200)
  const filter = `receivedDateTime ge ${since}`
  const url = `/me/mailFolders/Inbox/messages?$filter=${encodeURIComponent(filter)}&$top=${fetchN}&$orderby=receivedDateTime desc&$select=${select}`
  const resp = await graphFetch<{ value: GraphEmail[] }>('GET', url, undefined, PREFER_TEXT_BODY)
  const adminLower = ADMIN_INBOX.toLowerCase()
  const filtered = resp.value.filter((m) => {
    const recipients = [...(m.toRecipients ?? []), ...(m.ccRecipients ?? [])]
    return recipients.some((r) => r.emailAddress?.address?.toLowerCase() === adminLower)
      || m.from?.emailAddress?.address?.toLowerCase() === adminLower
  })
  return filtered.slice(0, limit)
}

// ────────────────────────────────────────────────────────────────────
// Parsed-email adapter — gives triage-inbox.ts the same shape it
// used to get from IMAP, so we can swap the source without rewriting
// the routine.
// ────────────────────────────────────────────────────────────────────

export type ParsedEmail = {
  uid: string // Graph message ID (kept as string; IMAP uid is numeric, but we never index on it)
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
  attachmentNames: string[] // Graph doesn't return names in $select for messages — left empty here
  receivedAt: Date
  headers: Record<string, string>
}

function header(g: GraphEmail, name: string): string | null {
  const h = g.internetMessageHeaders?.find((x) => x.name.toLowerCase() === name.toLowerCase())
  return h?.value ?? null
}

function toParsed(g: GraphEmail): ParsedEmail {
  const contentType = g.body?.contentType
  const isHtml = contentType === 'html' || contentType === 'HTML' as never
  const inReplyTo = header(g, 'In-Reply-To')
  const refRaw = header(g, 'References')
  const headersRecord: Record<string, string> = {}
  for (const h of g.internetMessageHeaders ?? []) {
    headersRecord[h.name.toLowerCase()] = h.value
  }
  return {
    uid: g.id,
    messageId: g.internetMessageId,
    inReplyTo,
    references: refRaw ? refRaw.split(/\s+/).filter(Boolean) : [],
    fromEmail: g.from?.emailAddress?.address ?? '',
    fromName: g.from?.emailAddress?.name ?? null,
    toEmails: g.toRecipients.map((r) => r.emailAddress.address).filter(Boolean),
    ccEmails: g.ccRecipients.map((r) => r.emailAddress.address).filter(Boolean),
    subject: g.subject ?? null,
    bodyText: isHtml ? null : g.body?.content ?? null,
    bodyHtml: isHtml ? g.body?.content ?? null : null,
    hasAttachments: g.hasAttachments,
    attachmentNames: [],
    receivedAt: new Date(g.receivedDateTime),
    headers: headersRecord,
  }
}

/** Drop-in replacement for imap.fetchUnreadEmails — pulls recent admin@ mail and normalises it. */
export async function fetchUnreadEmails(options?: {
  limit?: number
  markRead?: boolean
  sinceHours?: number
}): Promise<ParsedEmail[]> {
  const raw = await readAdminInbox({ limit: options?.limit ?? 50, sinceHours: options?.sinceHours ?? 72 })
  const parsed = raw.map(toParsed)

  if (options?.markRead) {
    for (const g of raw) {
      try {
        await markAsRead(g.id)
      } catch (e) {
        logger.warn({ err: (e as Error).message, id: g.id }, 'Failed to mark Graph message as read')
      }
    }
  }
  return parsed
}

/** Mark a Graph message as read. */
export async function markAsRead(messageId: string): Promise<void> {
  await graphFetch('PATCH', `/me/messages/${messageId}`, { isRead: true })
}

/**
 * Send an email via Microsoft Graph as the signed-in user (rhettbigstar@hotmail.com).
 * For BSC we set Reply-To: admin@bigstarcircus.com.au so customer replies route back to admin.
 * Returns a synthetic Graph send result. Graph /sendMail returns 202 with no body, so
 * we don't get a real message-id; we record a synthetic one for our ledger.
 */
export async function sendEmail(input: {
  to: string
  subject: string
  bodyText: string
  bodyHtml?: string
  replyTo?: string
  inReplyToId?: string
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const replyToAddr = input.replyTo ?? process.env.JACKY_REPLY_TO_ADDRESS ?? 'admin@bigstarcircus.com.au'
  const message = {
    subject: input.subject,
    body: {
      contentType: input.bodyHtml ? 'HTML' : 'Text',
      content: input.bodyHtml ?? input.bodyText,
    },
    toRecipients: [{ emailAddress: { address: input.to } }],
    replyTo: [{ emailAddress: { address: replyToAddr } }],
  }
  try {
    await graphFetch('POST', '/me/sendMail', { message, saveToSentItems: true })
    return { ok: true, messageId: `graph-sent-${Date.now()}` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

/** Health check. Personal MSA accounts often 403 on /me, so we probe the inbox instead. */
export async function testConnection(): Promise<{ ok: boolean; user?: string; error?: string }> {
  try {
    const token = await getAccessToken()
    if (!token) return { ok: false, error: 'No token' }
    // Personal Microsoft accounts (hotmail/outlook.com) frequently 403 on /me without User.Read scope.
    // Mail.Read is enough to hit /me/mailFolders/Inbox — use that as the probe.
    await graphFetch('GET', '/me/mailFolders/Inbox?$select=id,displayName,totalItemCount,unreadItemCount')
    const account = await getAccount()
    return { ok: true, user: account?.username || 'signed-in' }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
