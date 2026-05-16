#!/usr/bin/env node
// Test ClickSend connectivity. Optionally sends a self-test SMS if
// SELF_TEST=true (TO=04xx required).

import { testClickSendConnection, sendSms } from '../tools/clicksend.js'

const r = await testClickSendConnection()
if (!r.ok) {
  console.error(`❌ ${r.error}`)
  process.exit(1)
}
console.log(`✅ ClickSend account live. Balance: $${r.balance?.toFixed(2)} ${r.country}`)

if (process.env.SELF_TEST === 'true') {
  const to = process.env.SELF_TEST_TO
  if (!to) {
    console.error('Set SELF_TEST_TO=04xxxxxxxx to send a self-test SMS')
    process.exit(1)
  }
  console.log(`\nSending self-test SMS to ${to}...`)
  const send = await sendSms({
    to,
    body: 'Hi Rhett — Jacky here 🎪 SMS pipeline is live! - BSC',
  })
  if (send.ok) console.log(`✅ Sent. Message ID: ${send.messageId}`)
  else console.error(`❌ ${send.error}`)
}
process.exit(0)
