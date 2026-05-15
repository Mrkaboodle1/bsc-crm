#!/usr/bin/env node
// CLI: verify the Anthropic API key works.

import { askClaude } from '../tools/claude.js'

(async () => {
  console.log('Asking Claude for a quick test...')
  try {
    const result = await askClaude({
      system: 'You are Jacky, the BSC AI admin. Reply in one sentence with the BSC catch-phrase.',
      user: 'Say hi and the BSC anchor line.',
      maxTokens: 256,
    })
    console.log(`✅ Claude responded (${result.model}, ${result.inputTokens}→${result.outputTokens} tokens, $${result.costUsd.toFixed(6)}):`)
    console.log(`   "${result.output.trim()}"`)
    process.exit(0)
  } catch (e) {
    console.error(`❌ Claude call failed: ${(e as Error).message}`)
    process.exit(1)
  }
})()
