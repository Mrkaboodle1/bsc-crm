#!/usr/bin/env node
// Dump headers of recent emails so we can see what Titan forwarding preserves.

import { readUnread } from '../tools/graph.js'

const limit = Number(process.argv[2] ?? 10)

const emails = await readUnread(limit)
console.log(`\nInspecting ${emails.length} unread email(s)...\n`)

for (const e of emails) {
  console.log('═'.repeat(70))
  console.log(`Subject: ${e.subject}`)
  console.log(`From:    ${e.from?.emailAddress?.address}`)
  console.log(`To:      ${e.toRecipients.map((r) => r.emailAddress.address).join(', ')}`)
  console.log(`When:    ${e.receivedDateTime}`)
  console.log('Headers of interest:')
  const want = ['delivered-to', 'x-original-to', 'x-forwarded-to', 'x-forwarded-for', 'envelope-to', 'return-path', 'received', 'list-id', 'x-mailer', 'x-mailgun', 'authentication-results']
  for (const h of e.internetMessageHeaders ?? []) {
    if (want.includes(h.name.toLowerCase())) {
      console.log(`  ${h.name}: ${h.value.slice(0, 200)}`)
    }
  }
  console.log('')
}
process.exit(0)
