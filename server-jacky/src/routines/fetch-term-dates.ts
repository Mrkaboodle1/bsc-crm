// Yearly refresh of QLD state school term dates. Fetches the official
// future-dates page from education.qld.gov.au, parses out new years' terms,
// and rewrites app/src/lib/term-dates.ts so the CRM stays current without
// manual nudging.
//
// Scheduled in src/index.ts to run on 1 December each year (when the next
// year's dates are typically published). Idempotent — safe to run any time.

import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { logger } from '../logger.js'
import { config } from '../config.js'

const SOURCES = [
  'https://education.qld.gov.au/about-us/calendar/future-dates',
  'https://education.qld.gov.au/about-us/calendar/term-dates',
]

const TERM_DATES_FILE = path.resolve(
  process.env.BSC_CRM_REPO ?? 'C:/Users/Rhett Morrow/my-assistant/bsc-crm',
  'app/src/lib/term-dates.ts'
)

type ParsedTerm = { year: number; term: 1 | 2 | 3 | 4; start: string; end: string }

export async function fetchTermDates(): Promise<{ ok: boolean; added: number; total: number; error?: string }> {
  logger.info('Fetching QLD term dates from official sources')

  // 1. Fetch both pages as plain HTML/text
  const pages: string[] = []
  for (const url of SOURCES) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'BSC-CRM/0.1 (+https://bigstarcircus.com.au)' } })
      if (r.ok) {
        const text = await r.text()
        pages.push(`<!-- source: ${url} -->\n${text}`)
      } else {
        logger.warn({ url, status: r.status }, 'Source returned non-200')
      }
    } catch (e) {
      logger.warn({ url, err: (e as Error).message }, 'Fetch failed')
    }
  }

  if (pages.length === 0) {
    return { ok: false, added: 0, total: 0, error: 'No sources reachable' }
  }

  // 2. Use Claude to extract structured term dates from the noisy HTML.
  //    Cheaper + more robust than writing a brittle regex parser.
  const client = new Anthropic({ apiKey: config.anthropic.apiKey })
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2048,
    system:
      'You extract Queensland state school term dates from Education Queensland web pages. Return a single JSON object with one key "terms": an array of { year, term, start, end } objects. Use ISO YYYY-MM-DD dates. Include every year you find. No prose, no markdown — just the raw JSON.',
    messages: [
      {
        role: 'user',
        content: `Extract every (year, term, start, end) from these pages:\n\n${pages.join('\n\n---\n\n').slice(0, 60000)}`,
      },
    ],
  })

  const text = resp.content
    .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
    .map((c) => c.text)
    .join('')
  const jsonMatch = text.match(/\{[\s\S]*"terms"[\s\S]*\}/)
  if (!jsonMatch) {
    return { ok: false, added: 0, total: 0, error: `Could not find JSON in Claude response: ${text.slice(0, 200)}` }
  }
  let parsed: { terms: ParsedTerm[] }
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch (e) {
    return { ok: false, added: 0, total: 0, error: `JSON parse failed: ${(e as Error).message}` }
  }

  // 3. Merge with existing file. Match by (year, term) — overwrite if changed.
  if (!existsSync(TERM_DATES_FILE)) {
    return { ok: false, added: 0, total: 0, error: `term-dates.ts not found at ${TERM_DATES_FILE}` }
  }

  const existing = readFileSync(TERM_DATES_FILE, 'utf8')
  const blockMatch = existing.match(/export const TERM_DATES: TermRange\[\] = \[([\s\S]*?)\n\]/)
  if (!blockMatch) {
    return { ok: false, added: 0, total: 0, error: 'Could not locate TERM_DATES block in existing file' }
  }

  // Pull existing rows into a map
  const existingMap = new Map<string, ParsedTerm>()
  const rowRe = /\{\s*year:\s*(\d{4}),\s*term:\s*(\d),\s*start:\s*'([^']+)',\s*end:\s*'([^']+)'\s*\}/g
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(blockMatch[1]!)) !== null) {
    const t = { year: parseInt(m[1]!, 10), term: parseInt(m[2]!, 10) as 1 | 2 | 3 | 4, start: m[3]!, end: m[4]! }
    existingMap.set(`${t.year}-${t.term}`, t)
  }

  // Merge in new dates (Claude's parsed output wins for shared keys — assumed canonical)
  let added = 0
  for (const t of parsed.terms) {
    const key = `${t.year}-${t.term}`
    const prev = existingMap.get(key)
    if (!prev || prev.start !== t.start || prev.end !== t.end) {
      existingMap.set(key, t)
      if (!prev) added++
    }
  }

  // 4. Rewrite the file. Group by year, sort ascending.
  const sorted = [...existingMap.values()].sort((a, b) => a.year - b.year || a.term - b.term)
  const grouped: Record<number, ParsedTerm[]> = {}
  for (const t of sorted) (grouped[t.year] = grouped[t.year] ?? []).push(t)

  const blockLines: string[] = []
  for (const year of Object.keys(grouped).map(Number).sort()) {
    blockLines.push(`  // ${year}`)
    for (const t of grouped[year]!) {
      blockLines.push(`  { year: ${t.year}, term: ${t.term}, start: '${t.start}', end: '${t.end}' },`)
    }
    blockLines.push('')
  }
  const newBlock = `export const TERM_DATES: TermRange[] = [\n${blockLines.join('\n').replace(/\n+$/, '\n')}]`
  const today = new Date().toISOString().slice(0, 10)
  const updatedHeader = existing.replace(
    /\/\/ Last updated: \d{4}-\d{2}-\d{2}/,
    `// Last updated: ${today}`
  )
  const newContent = updatedHeader.replace(/export const TERM_DATES: TermRange\[\] = \[[\s\S]*?\n\]/, newBlock)
  writeFileSync(TERM_DATES_FILE, newContent, 'utf8')

  logger.info({ added, total: sorted.length }, 'QLD term dates refreshed')
  return { ok: true, added, total: sorted.length }
}
