#!/usr/bin/env node
// One-shot: triggers the device code flow if no tokens are cached yet.
// Prints the URL + code, waits for the user to complete, then verifies access.

import { getAccessToken, testConnection } from '../tools/graph.js'

(async () => {
  console.log('🔐 Microsoft Graph device code login\n')
  console.log('On first run you\'ll see a URL + code to enter on your phone.\n')

  try {
    await getAccessToken({
      onDeviceCode: (msg) => {
        console.log('\n' + '═'.repeat(70))
        console.log(msg)
        console.log('═'.repeat(70) + '\n')
      },
    })
    console.log('✅ Token acquired + cached.\n')
  } catch (e) {
    console.error('❌ Login failed:', (e as Error).message)
    process.exit(1)
  }

  console.log('Testing /me endpoint...')
  const result = await testConnection()
  if (result.ok) {
    console.log(`✅ Logged in as: ${result.user}`)
    console.log('\nServer-Jacky can now read your Hotmail inbox via Microsoft Graph.')
    process.exit(0)
  } else {
    console.error(`❌ Connection test failed: ${result.error}`)
    process.exit(1)
  }
})()
