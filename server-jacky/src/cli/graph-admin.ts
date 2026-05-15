#!/usr/bin/env node
// Preview what readAdminInbox returns — emails forwarded to admin@.

import { readAdminInbox } from '../tools/graph.js'

const hours = Number(process.argv[2] ?? 72)
const emails = await readAdminInbox({ sinceHours: hours, limit: 50 })

console.log(`\nFound ${emails.length} admin@ email(s) in the last ${hours}h:\n`)
for (const e of emails) {
  console.log('─'.repeat(70))
  console.log(`Subject: ${e.subject}`)
  console.log(`From:    ${e.from?.emailAddress?.address}`)
  console.log(`To:      ${e.toRecipients.map((r) => r.emailAddress.address).join(', ')}`)
  console.log(`When:    ${e.receivedDateTime}`)
  console.log(`Read:    ${e.isRead}`)
  console.log(`Preview: ${e.bodyPreview.slice(0, 150)}`)
}
process.exit(0)
