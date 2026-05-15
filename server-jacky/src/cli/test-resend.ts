#!/usr/bin/env node
// Test Resend connectivity. Prints registered domains + status.
// Optionally sends a self-test if SELF_TEST=true.

import { testResendConnection, sendEmail } from '../tools/resend.js'

const r = await testResendConnection()
if (!r.ok) {
  console.error(`❌ ${r.error}`)
  process.exit(1)
}
console.log(`✅ Resend API key valid.`)
console.log(`Domains: ${r.domains?.length ? r.domains.join(', ') : '(none registered yet)'}`)

if (process.env.SELF_TEST === 'true') {
  const to = process.env.SELF_TEST_TO || 'rhettbigstar@hotmail.com'
  console.log(`\nSending self-test to ${to}...`)
  const send = await sendEmail({
    to,
    subject: '🎪 Resend self-test from Jacky',
    bodyText: 'If you can read this, Resend is wired up and Jacky can send AS admin@bigstarcircus.com.au.\n\nJacky',
  })
  if (send.ok) console.log(`✅ Sent. Message ID: ${send.messageId}`)
  else console.error(`❌ ${send.error}`)
}
process.exit(0)
