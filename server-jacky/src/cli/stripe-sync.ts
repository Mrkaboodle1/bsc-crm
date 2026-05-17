#!/usr/bin/env node
// One-shot Stripe → families sync. Pass --dry to preview without writing.

import { testStripeConnection } from '../tools/stripe.js'
import { syncStripe } from '../routines/stripe-sync.js'

const dryRun = process.argv.includes('--dry')

const conn = await testStripeConnection()
if (!conn.ok) {
  console.error(`❌ Stripe connection failed: ${conn.error}`)
  process.exit(1)
}
console.log(`✅ Stripe live · ${conn.activeSubs} active subscription(s)\n`)

if (dryRun) console.log('🟡 DRY RUN — no writes will happen.\n')

const t0 = Date.now()
const result = await syncStripe({ dryRun })
const dur = ((Date.now() - t0) / 1000).toFixed(1)

console.log(`\n${dryRun ? '[DRY RUN] ' : ''}Stripe sync complete in ${dur}s:`)
console.log(`  Customers from Stripe : ${result.customersFromStripe}`)
console.log(`  Subscriptions         : ${result.subsFromStripe}`)
console.log(`  Families inserted     : ${result.familiesInserted}`)
console.log(`  Families updated      : ${result.familiesUpdated}`)
console.log(`  Skipped               : ${result.familiesSkipped}`)
if (result.errors.length) {
  console.log(`\n⚠ ${result.errors.length} error(s):`)
  for (const e of result.errors.slice(0, 10)) console.log(`  - ${e}`)
}
process.exit(0)
