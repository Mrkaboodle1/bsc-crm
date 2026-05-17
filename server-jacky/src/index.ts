// Server-Jacky entry point. Sets up the cron schedule, runs the triage
// routine, and stays alive under systemd.

import cron from 'node-cron'
import { triageInbox } from './routines/triage-inbox.js'
import { sendApprovedActions } from './routines/send-approved.js'
import { fetchTermDates } from './routines/fetch-term-dates.js'
import { logger } from './logger.js'
import { config } from './config.js'

logger.info({
  stage: config.stage,
  dryRun: config.dryRun,
  model: config.anthropic.model,
  tz: config.timezone,
}, 'Server-Jacky starting up 🎪')

// Run once at startup so we don't wait 15 min for the first triage
triageInbox().catch((e) => {
  logger.error({ err: (e as Error).message }, 'Initial triage failed')
})

// Every 15 minutes — check the inbox + draft replies
cron.schedule('*/15 * * * *', async () => {
  logger.info('⏰ Scheduled triage starting')
  try {
    const result = await triageInbox()
    logger.info(result, '✅ Triage finished')
  } catch (e) {
    logger.error({ err: (e as Error).message }, '❌ Triage failed')
  }
}, { timezone: config.timezone })

// Every 60 seconds — check the approval queue + send any 'approved' rows
cron.schedule('*/1 * * * *', async () => {
  try {
    const result = await sendApprovedActions()
    if (result.sent > 0 || result.failed > 0) {
      logger.info(result, '📤 Send-approved cycle')
    }
  } catch (e) {
    logger.error({ err: (e as Error).message }, '❌ Send-approved cycle failed')
  }
}, { timezone: config.timezone })

// 07:30 Brisbane every day — morning summary (TODO: implement)
cron.schedule('30 7 * * *', () => {
  logger.info('🌅 Morning summary cron fired (not yet implemented)')
}, { timezone: config.timezone })

// Once a year — fetch new QLD school term dates from education.qld.gov.au.
// 01:00 on 1 December (next year's dates are typically up by then). Also
// refresh once on 1 February as a safety net for late-published years.
async function refreshTermDates(reason: string) {
  logger.info({ reason }, '📅 Yearly QLD term-dates refresh starting')
  try {
    const result = await fetchTermDates()
    logger.info(result, '✅ Term dates refreshed')
  } catch (e) {
    logger.error({ err: (e as Error).message }, '❌ Term dates refresh failed')
  }
}
cron.schedule('0 1 1 12 *', () => refreshTermDates('annual-dec'), { timezone: config.timezone })
cron.schedule('0 1 1 2 *',  () => refreshTermDates('annual-feb-fallback'), { timezone: config.timezone })

// Keep the process alive — graceful shutdown on SIGTERM (systemd)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully')
  process.exit(0)
})
process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down')
  process.exit(0)
})

logger.info('Server-Jacky scheduled, sleeping between cron ticks 💤')
