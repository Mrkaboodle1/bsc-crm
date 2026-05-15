#!/usr/bin/env node
// CLI: verify IMAP credentials work + show inbox stats.

import { testImapConnection } from '../tools/imap.js'

(async () => {
  console.log('Testing IMAP connection to Titan Email...')
  const result = await testImapConnection()
  if (result.ok) {
    console.log(`✅ Connected. Inbox has ${result.messageCount} total messages, ${result.unseenCount} unseen.`)
    process.exit(0)
  } else {
    console.error(`❌ Connection failed: ${result.error}`)
    process.exit(1)
  }
})()
