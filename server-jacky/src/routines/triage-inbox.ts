// The core daily routine: read admin@'s inbox, classify each new email,
// draft a reply where appropriate, push everything into the CRM approval queue.

import crypto from 'node:crypto'
import { fetchUnreadEmails, type ParsedEmail } from '../tools/graph.js'
import { askClaudeJson } from '../tools/claude.js'
import { JACKY_SYSTEM_PROMPT } from '../prompts/system.js'
import {
  persistEmailMessage,
  enqueueAction,
  logAgentActivity,
  findFamilyByEmail,
  isEmailAlreadyPersisted,
} from '../tools/supabase.js'
import { logger } from '../logger.js'
import { config } from '../config.js'

type ClaudeTriageJson = {
  classification: string
  classification_confidence: number
  classification_notes: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  reply_to_email?: string | null
  reply_to_name?: string | null
  matched_family_name?: string | null
  matched_student_first_name?: string | null
  reasoning: string
  draft_subject: string
  draft_body: string
}

const NON_DRAFT_CATEGORIES = new Set([
  'junk_or_automated',
  'newsletter_or_promo',
  'supplier_or_vendor',
])

export async function triageInbox(): Promise<{
  emailsRead: number
  draftsCreated: number
  filed: number
  totalCostUsd: number
  errors: string[]
}> {
  const startedAt = new Date()
  logger.info({ stage: config.stage, dryRun: config.dryRun }, 'Triage inbox routine starting')

  let emailsRead = 0
  let draftsCreated = 0
  let filed = 0
  let totalCostUsd = 0
  const errors: string[] = []

  try {
    // Step 1 — fetch unread emails
    const emails = await fetchUnreadEmails({ limit: 25, markRead: false })
    emailsRead = emails.length
    logger.info({ count: emails.length }, 'Fetched unread emails')

    // Step 2 — process each email
    for (const email of emails) {
      try {
        await processEmail(email, (kind) => {
          if (kind === 'drafted') draftsCreated++
          else if (kind === 'filed') filed++
        }, (cost) => {
          totalCostUsd += cost
        })
      } catch (e) {
        const msg = `Email ${email.uid} (${email.subject?.slice(0, 60) ?? 'no subject'}): ${(e as Error).message}`
        logger.error({ err: msg, subject: email.subject }, 'Failed to process email')
        errors.push(msg)
      }
    }
  } catch (e) {
    const msg = (e as Error).message
    logger.error({ err: msg }, 'Triage routine failed')
    errors.push(`Routine error: ${msg}`)
  }

  const finishedAt = new Date()
  const summary = `Read ${emailsRead}, drafted ${draftsCreated}, filed ${filed}, errors ${errors.length}, $${totalCostUsd.toFixed(4)}`
  logger.info({ emailsRead, draftsCreated, filed, errors: errors.length, totalCostUsd }, summary)

  // Step 3 — log to agent_activity
  await logAgentActivity({
    routine: 'triage_inbox',
    startedAt,
    finishedAt,
    status: errors.length === 0 ? 'success' : 'failure',
    emailsRead,
    draftsCreated,
    errors: errors.map((e) => ({ message: e })),
    logSummary: summary,
    aiCostUsd: totalCostUsd,
  }).catch((e) => {
    logger.warn({ err: (e as Error).message }, 'Failed to log agent_activity (non-fatal)')
  })

  return { emailsRead, draftsCreated, filed, totalCostUsd, errors }
}

async function processEmail(
  email: ParsedEmail,
  countFn: (kind: 'drafted' | 'filed') => void,
  costFn: (cost: number) => void
): Promise<void> {
  // 1. Compute thread key — used to group conversation
  const threadKey = computeThreadKey(email)

  // 2. Cheap dedup probe BEFORE the Claude call — saves ~3¢ per startup re-run
  const alreadySeen = await isEmailAlreadyPersisted(email.messageId)
  if (alreadySeen) {
    logger.debug({ messageId: email.messageId, subject: email.subject?.slice(0, 60) }, 'Email already persisted — skipping Claude call')
    return
  }

  // 3. Match family by sender email (best-effort)
  const matchedFamilyId = await findFamilyByEmail(email.fromEmail)

  // 4. Build the user prompt for Claude
  const userPrompt = buildEmailTriagePrompt(email)

  // 5. Call Claude — classify + draft reply
  const result = await askClaudeJson<ClaudeTriageJson>({
    system: JACKY_SYSTEM_PROMPT,
    user: userPrompt,
  })
  costFn(result.costUsd)

  const classification = result.output.classification
  const confidence = result.output.classification_confidence
  const priority = result.output.priority

  logger.info({
    subject: email.subject?.slice(0, 80),
    from: email.fromEmail,
    classification,
    confidence,
    priority,
    reply_to_email: result.output.reply_to_email,
    reply_to_name: result.output.reply_to_name,
    cost: result.costUsd,
  }, 'Email triaged')

  // 5. Persist the email
  const { id: emailMessageId, existed } = await persistEmailMessage({
    messageId: email.messageId,
    inReplyTo: email.inReplyTo,
    threadKey,
    fromEmail: email.fromEmail,
    fromName: email.fromName,
    toEmails: email.toEmails,
    ccEmails: email.ccEmails,
    subject: email.subject,
    bodyText: email.bodyText,
    bodyHtml: email.bodyHtml,
    hasAttachments: email.hasAttachments,
    attachmentNames: email.attachmentNames,
    receivedAt: email.receivedAt,
    classification,
    classificationConfidence: confidence,
    classificationNotes: result.output.classification_notes,
    matchedFamilyId,
    rawHeaders: email.headers,
  })

  if (existed) {
    logger.debug({ emailMessageId }, 'Email already persisted — skipping duplicate draft')
    return
  }

  // 6. If it's junk / newsletter / supplier — file it. No draft needed.
  if (NON_DRAFT_CATEGORIES.has(classification)) {
    countFn('filed')
    return
  }

  // 7. Otherwise enqueue an email_reply pending action.
  //    Prefer Claude's parsed reply_to_email (for web-form submissions where
  //    From = admin@bigstarcircus.com.au). Fall back to the envelope From.
  const ownAddress = 'admin@bigstarcircus.com.au'
  const parsedReplyTo = result.output.reply_to_email?.trim() || null
  let recipient = parsedReplyTo && parsedReplyTo.toLowerCase() !== ownAddress
    ? parsedReplyTo
    : (email.fromEmail && email.fromEmail.toLowerCase() !== ownAddress ? email.fromEmail : null)

  if (!recipient) {
    logger.warn({ subject: email.subject, from: email.fromEmail }, 'No reply-to address — skipping draft')
    countFn('filed')
    return
  }

  await enqueueAction({
    kind: 'email_reply',
    triggeredBy: 'inbound_email',
    sourceEmailId: emailMessageId,
    relatedFamilyId: matchedFamilyId,
    draftSubject: result.output.draft_subject,
    draftBody: result.output.draft_body,
    draftRecipient: recipient,
    draftMetadata: {
      in_reply_to: email.messageId,
      references: email.references,
      from_name: result.output.reply_to_name ?? email.fromName,
      classification,
      classification_confidence: confidence,
      parsed_from_form_body: parsedReplyTo ? true : false,
    },
    priority,
    reasoning: result.output.reasoning,
    aiProvider: 'anthropic',
    aiModel: result.model,
    aiInputTokens: result.inputTokens,
    aiOutputTokens: result.outputTokens,
    aiCostUsd: result.costUsd,
  })

  countFn('drafted')
}

function computeThreadKey(email: ParsedEmail): string {
  // Prefer References / In-Reply-To if present; else hash subject + from.
  if (email.references && email.references.length > 0) {
    return crypto.createHash('sha256').update(email.references.join(' ')).digest('hex').slice(0, 32)
  }
  if (email.inReplyTo) {
    return crypto.createHash('sha256').update(email.inReplyTo).digest('hex').slice(0, 32)
  }
  const seed = `${(email.subject ?? '').replace(/^(re|fwd?):\s*/i, '').trim().toLowerCase()}|${email.fromEmail}`
  return crypto.createHash('sha256').update(seed).digest('hex').slice(0, 32)
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function buildEmailTriagePrompt(email: ParsedEmail): string {
  const adminLower = 'admin@bigstarcircus.com.au'
  const isFormPattern = email.fromEmail?.toLowerCase() === adminLower
    && email.toEmails.some((t) => t.toLowerCase() === adminLower)
  const formHint = isFormPattern
    ? `\n⚠️ FORM PATTERN DETECTED — this is From=admin@ To=admin@. It is a website lead, NOT junk. Parse the customer's email and name out of the body. See the "Web form submissions" section of your system prompt.\n`
    : ''
  return `An email just landed in admin@bigstarcircus.com.au. Classify it, then draft a reply (unless it's junk / newsletter / supplier).
${formHint}
## Email envelope
From: ${email.fromName ? `${email.fromName} <${email.fromEmail}>` : email.fromEmail}
To: ${email.toEmails.join(', ')}
${email.ccEmails.length > 0 ? `Cc: ${email.ccEmails.join(', ')}\n` : ''}Subject: ${email.subject ?? '(no subject)'}
Received: ${email.receivedAt.toISOString()}
Has attachments: ${email.hasAttachments ? `yes (${email.attachmentNames.join(', ')})` : 'no'}

## Email body
${(email.bodyText && email.bodyText.trim().length > 0
  ? email.bodyText
  : email.bodyHtml ? stripHtml(email.bodyHtml) : '(empty body)'
).slice(0, 6000)}

---

Return a single JSON object as specified in your system prompt. No surrounding prose.`
}
