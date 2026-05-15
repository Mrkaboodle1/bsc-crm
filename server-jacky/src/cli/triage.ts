#!/usr/bin/env node
// CLI: run a single triage pass and exit. Used for manual testing / debugging.

import { triageInbox } from '../routines/triage-inbox.js'
import { logger } from '../logger.js'

(async () => {
  try {
    const result = await triageInbox()
    logger.info(result, '✅ Triage complete')
    process.exit(0)
  } catch (e) {
    logger.error({ err: (e as Error).message, stack: (e as Error).stack }, '❌ Triage failed')
    process.exit(1)
  }
})()
