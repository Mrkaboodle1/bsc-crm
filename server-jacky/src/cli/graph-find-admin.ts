#!/usr/bin/env node
// Find emails forwarded from admin@bigstarcircus.com.au — look across the
// Inbox (read or unread) so we can see what Titan's forwarding signature
// looks like.

import { getAccessToken } from '../tools/graph.js'

const GRAPH = 'https://graph.microsoft.com/v1.0'

const token = await getAccessToken()

// $search lets us look across body, subject and recipients. Quote it so the
// special chars in the email address are passed through cleanly.
const url = `${GRAPH}/me/mailFolders/Inbox/messages?$search="bigstarcircus.com.au"&$top=20&$select=id,subject,from,toRecipients,receivedDateTime,internetMessageId,bodyPreview`

const res = await fetch(url, {
  method: 'GET',
  headers: {
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
    // $search on Outlook personal accounts requires this header in some cases
    Prefer: 'outlook.body-content-type="text"',
  },
})

if (!res.ok) {
  console.error(`❌ ${res.status} ${await res.text()}`)
  process.exit(1)
}

const data = await res.json() as { value: Array<{ id: string; subject: string; from: { emailAddress: { address: string; name?: string } } | null; toRecipients: Array<{ emailAddress: { address: string } }>; receivedDateTime: string; internetMessageId: string; bodyPreview: string }> }

console.log(`\nFound ${data.value.length} message(s) mentioning bigstarcircus.com.au:\n`)
for (const m of data.value) {
  console.log('─'.repeat(70))
  console.log(`Subject: ${m.subject}`)
  console.log(`From:    ${m.from?.emailAddress?.address}`)
  console.log(`To:      ${m.toRecipients.map((r) => r.emailAddress.address).join(', ')}`)
  console.log(`When:    ${m.receivedDateTime}`)
  console.log(`Preview: ${m.bodyPreview.slice(0, 150)}`)
}
process.exit(0)
