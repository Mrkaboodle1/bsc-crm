#!/usr/bin/env node
// CLI: verify SMTP credentials work (no send, just verify auth handshake).

import { testSmtpConnection } from '../tools/smtp.js'

(async () => {
  console.log('Testing SMTP connection to Titan Email...')
  const result = await testSmtpConnection()
  if (result.ok) {
    console.log('✅ SMTP auth handshake succeeded.')
    process.exit(0)
  } else {
    console.error(`❌ SMTP connection failed: ${result.error}`)
    process.exit(1)
  }
})()
