#!/usr/bin/env node
// Quick sanity test: read 5 unread emails from Hotmail via Microsoft Graph.
// Run AFTER graph:login so we have cached tokens.

import { readUnread, testConnection } from '../tools/graph.js'

(async () => {
  console.log('🔍 Testing Microsoft Graph read access to Hotmail...\n')

  const conn = await testConnection()
  if (!conn.ok) {
    console.error(`❌ Connection failed: ${conn.error}`)
    console.error('Run "npm run graph:login" first to grant access.')
    process.exit(1)
  }

  console.log(`✅ Connected as: ${conn.user}\n`)
  console.log('Reading up to 5 most recent unread emails...\n')

  const emails = await readUnread(5)
  console.log(`Found ${emails.length} unread.\n`)

  for (const e of emails) {
    console.log('─'.repeat(70))
    console.log(`From:    ${e.from?.emailAddress?.address ?? '?'}`)
    console.log(`Subject: ${e.subject ?? '(no subject)'}`)
    console.log(`When:    ${e.receivedDateTime}`)
    console.log(`Preview: ${e.bodyPreview.slice(0, 120)}`)
  }
  console.log('─'.repeat(70))
  console.log('\n✅ Graph read access works. Jacky can now triage admin@ via Hotmail.')
  process.exit(0)
})()
