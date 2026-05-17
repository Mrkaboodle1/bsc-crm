#!/usr/bin/env node
// Manually trigger the QLD term-dates refresh. Useful when you suspect
// the cached dates are stale. Also wired into the yearly cron in index.ts.

import { fetchTermDates } from '../routines/fetch-term-dates.js'

const result = await fetchTermDates()
if (!result.ok) {
  console.error(`❌ ${result.error}`)
  process.exit(1)
}
console.log(`✅ Done. ${result.added} new term(s) added, ${result.total} total in cache.`)
process.exit(0)
