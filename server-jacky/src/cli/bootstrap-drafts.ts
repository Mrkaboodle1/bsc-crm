#!/usr/bin/env node
// Manual bootstrap: seed the BSC /inbox approval queue with hand-drafted
// replies to actual recent leads while we figure out Titan IMAP.
// One-shot script. After running once, server-Jacky takes over automation.

import { persistEmailMessage, enqueueAction, supabase, getTenantId } from '../tools/supabase.js'
import { logger } from '../logger.js'

const SIGNOFF = `

Jacky
Big Star Circus — Admin
📍 Unit 1/14 Harper St, Molendinar QLD 4214
📞 0489 188 179
📧 admin@bigstarcircus.com.au
🌐 www.bigstarcircus.com.au
📸 @bigstarcircus on Instagram & Facebook
🎪 Where every kid finds their place — no rankings, just applause.`

// === DRAFT 1 — Alannah Bodman (free trial, today) ============================

const alannahSource = {
  messageId: '<lead-alannah-20260515-001@bigstarcircus.com.au>',
  inReplyTo: null,
  threadKey: 'lead-alannah-20260515',
  fromEmail: 'alannahbodman93@outlook.com',
  fromName: 'Alannah Bodman',
  toEmails: ['admin@bigstarcircus.com.au'],
  ccEmails: [],
  subject: 'Free trial enquiry — via BigStar Circus website',
  bodyText: `New web lead (via BigStar Circus website contact form, 15 May 2026 10:31 AEST):

Name: Alannah Bodman
Email: alannahbodman93@outlook.com
Phone: 0434 550 039
Interest: Free trial`,
  bodyHtml: null,
  hasAttachments: false,
  attachmentNames: [],
  receivedAt: new Date('2026-05-15T00:31:56Z'),
  classification: 'trial_enquiry',
  classificationConfidence: 0.95,
  classificationNotes: 'Website contact form — explicit "free trial" interest. Minimal info — needs follow-up to capture kid name/age/discipline preference.',
  matchedFamilyId: null,
}

const alannahDraftBody = `Hi Alannah! 😊

Thank you so much for reaching out — we'd LOVE to welcome you into the BigStar family! 💫

Here's how our free trial works: your child gets **3 classes free**, across any 3 disciplines they'd like to try — Acro, Aerial, Circus Fusion, Drama, even adult classes if they're 18+. No card on file, no commitment, no catch. They get to discover what they LOVE before you decide on anything.

To lock them in, I just need a few details:

• Your child's **first name + age**
• Any disciplines they're drawn to (or just "let's see what they love" works too!)
• A **preferred day/time** — we run classes Mon to Sat across the day

Have a peek at our class times here: https://bigstarcircus.com.au/classes — then just hit reply with what suits, and I'll get them booked in!

Can't wait to meet your superstar 🎪⭐` + SIGNOFF

// === DRAFT 2 — Natasha Muller (vague "Order" enquiry, today) =================

const natashaSource = {
  messageId: '<lead-natasha-20260515-001@bigstarcircus.com.au>',
  inReplyTo: null,
  threadKey: 'lead-natasha-20260515',
  fromEmail: 'natasha.bates.3@gmail.com',
  fromName: 'Natasha Muller',
  toEmails: ['admin@bigstarcircus.com.au'],
  ccEmails: [],
  subject: 'Website enquiry — Natasha Muller',
  bodyText: `New web lead (via BigStar Circus website contact form, 15 May 2026 14:46 AEST):

Name: Natasha Muller
Phone: 0413 861 514
Email: natasha.bates.3@gmail.com
Source: website
Interest: (form just labelled "Order" — no further detail given)`,
  bodyHtml: null,
  hasAttachments: false,
  attachmentNames: [],
  receivedAt: new Date('2026-05-15T04:46:19Z'),
  classification: 'other',
  classificationConfidence: 0.6,
  classificationNotes: 'Website form labelled "Order" — could be birthday party, free trial, holiday programme, show booking, NDIS, or merchandise. Reply asks her to clarify.',
  matchedFamilyId: null,
}

const natashaDraftBody = `Hi Natasha! 😊

Thank you for getting in touch with BigStar Circus — we'd love to help you out! I just want to make sure I send the right info, so could you let me know what you're after?

A few common ones we get:

• 🎉 **Birthday party** for a child — circus-themed parties at the studio, $40/child (min 10 kids), 90 min of magic
• 🎪 **Free trial classes** for a child — 3 free classes across any disciplines (Acro, Aerial, Circus Fusion, Drama)
• 📅 **School holiday programme** — Acro / Circus / Aerial workshops
• 🎟 **Show or event booking** — Mr Kaboodle character or full circus performance
• 💜 **NDIS-funded classes** — we welcome plan-managed families
• Or something else entirely!

Just hit reply with what you're chasing, plus the **child's name + age** if relevant, and I'll get you sorted in a flash! ⭐` + SIGNOFF

// === Push ====================================================================

async function main() {
  const tenantId = await getTenantId()
  logger.info({ tenantId }, 'Bootstrap drafts starting')

  let drafted = 0
  for (const { source, draft, draftSubject, priority, reasoning } of [
    {
      source: alannahSource,
      draft: alannahDraftBody,
      draftSubject: 'Welcome to Big Star Circus 🎪 — let\'s get your free trial booked!',
      priority: 'high' as const,
      reasoning:
        'Trial enquiry, classic warm welcome. Draft anchors on the 3-class free trial offer (BSC\'s standard hook) and asks the 3 qualifying questions (kid name+age / discipline interest / preferred day-time). Links to the public class-times page. Keeps it short and warm — "no rankings, just applause" implied through the tone, not stated overtly.',
    },
    {
      source: natashaSource,
      draft: natashaDraftBody,
      draftSubject: 'Hi Natasha — quick question about your BigStar enquiry 😊',
      priority: 'high' as const,
      reasoning:
        'Vague form submission labelled "Order" — could be birthday party, trial, holiday programme, show, NDIS, or merch. Rather than guess, reply offers a 6-option menu so Natasha self-selects. Each option mentions pricing/format inline so we don\'t need a second back-and-forth.',
    },
  ]) {
    try {
      const { id: emailId } = await persistEmailMessage(source)
      const actionId = await enqueueAction({
        kind: 'email_reply',
        triggeredBy: 'inbound_email',
        sourceEmailId: emailId,
        relatedFamilyId: null,
        draftSubject,
        draftBody: draft,
        draftRecipient: source.fromEmail,
        draftMetadata: { in_reply_to: source.messageId, from_name: source.fromName },
        priority,
        reasoning,
        aiProvider: 'manual',
        aiModel: 'jacky-handwritten-v0',
        aiInputTokens: 0,
        aiOutputTokens: 0,
        aiCostUsd: 0,
      })
      logger.info({ source: source.fromEmail, emailId, actionId }, '✅ Pushed draft')
      drafted++
    } catch (e) {
      logger.error({ err: (e as Error).message, source: source.fromEmail }, '❌ Push failed')
    }
  }

  logger.info({ drafted }, `🎪 Bootstrap complete — ${drafted} draft(s) in the /inbox approval queue`)
  console.log(`\n🎪 Done. Open https://app-chi-silk-29.vercel.app/inbox on your phone to approve ${drafted} draft(s).`)
  process.exit(0)
}

main().catch((e) => {
  console.error('❌ Bootstrap failed:', e.message)
  process.exit(1)
})
