// Anthropic SDK wrapper. Centralises Claude calls so we can swap providers
// (e.g. to Gemini) later by editing one file.

import Anthropic from '@anthropic-ai/sdk'
import { config } from '../config.js'
import { logger } from '../logger.js'

const anthropic = new Anthropic({ apiKey: config.anthropic.apiKey })

export type ClaudeResult<T = string> = {
  output: T
  inputTokens: number
  outputTokens: number
  costUsd: number
  model: string
  provider: 'anthropic'
}

// Sonnet 4.5 pricing as of mid-2026 (USD per million tokens). Adjust if Anthropic changes.
const PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 3.0, output: 15.0 },
  'claude-sonnet-4-7': { input: 3.0, output: 15.0 },
  'claude-opus-4-5':   { input: 15.0, output: 75.0 },
  'claude-haiku-4-5':  { input: 0.8, output: 4.0 },
}

function costFor(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING[model] ?? PRICING['claude-sonnet-4-5']!
  const inputCost = (inputTokens / 1_000_000) * p.input
  const outputCost = (outputTokens / 1_000_000) * p.output
  return +(inputCost + outputCost).toFixed(6)
}

export async function askClaude(opts: {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
  jsonMode?: boolean
}): Promise<ClaudeResult<string>> {
  const start = Date.now()
  const model = config.anthropic.model
  const result = await anthropic.messages.create({
    model,
    max_tokens: opts.maxTokens ?? config.anthropic.maxTokens,
    temperature: opts.temperature ?? 0.5,
    system: opts.system,
    messages: [{ role: 'user', content: opts.user }],
  })

  const textBlock = result.content.find((c) => c.type === 'text')
  const output = textBlock && textBlock.type === 'text' ? textBlock.text : ''

  const inputTokens = result.usage.input_tokens
  const outputTokens = result.usage.output_tokens
  const costUsd = costFor(model, inputTokens, outputTokens)

  logger.debug({
    model,
    inputTokens,
    outputTokens,
    costUsd,
    durationMs: Date.now() - start,
  }, 'Claude call completed')

  return {
    output,
    inputTokens,
    outputTokens,
    costUsd,
    model,
    provider: 'anthropic',
  }
}

export async function askClaudeJson<T>(opts: {
  system: string
  user: string
  maxTokens?: number
  temperature?: number
}): Promise<ClaudeResult<T>> {
  const result = await askClaude({ ...opts, jsonMode: true })

  // Strip code fences / leading prose if Claude added any.
  let cleaned = result.output.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) cleaned = fenceMatch[1]!.trim()
  // Find the first { and last } in case Claude added preamble.
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  let parsed: T
  try {
    parsed = JSON.parse(cleaned) as T
  } catch (e) {
    logger.error({ raw: result.output, cleaned, err: String(e) }, 'Failed to parse Claude JSON response')
    throw new Error(`Claude JSON parse error: ${(e as Error).message}`)
  }

  return { ...result, output: parsed }
}
