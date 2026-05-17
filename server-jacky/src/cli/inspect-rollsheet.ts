#!/usr/bin/env node
// Quick structural inspection of the BSC roll-sheet xlsx so we can design
// the importer without guessing.

import { readFileSync } from 'node:fs'
import { read, utils } from 'xlsx'

const file = process.argv[2] ?? 'C:\\Users\\Rhett Morrow\\my-assistant\\crm\\Bigstar Roll Call Sheets 2026 Term 2.xlsx'

const buf = readFileSync(file)
const wb = read(buf, { type: 'buffer' })
console.log(`Sheets in workbook (${wb.SheetNames.length}):`)
for (const name of wb.SheetNames) {
  const sheet = wb.Sheets[name]!
  const range = utils.decode_range(sheet['!ref'] ?? 'A1')
  const rows = range.e.r - range.s.r + 1
  const cols = range.e.c - range.s.c + 1
  console.log(`  - ${name.padEnd(40)} ${rows}r × ${cols}c`)
}

const targetSheet = process.argv[3] ?? wb.SheetNames[0]!
console.log(`\n--- Preview of "${targetSheet}" (first 25 rows) ---`)
const sheet = wb.Sheets[targetSheet]!
const data = utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false })
for (let i = 0; i < Math.min(25, data.length); i++) {
  const row = data[i] as unknown[]
  const compact = row.slice(0, 8).map((c) => String(c ?? '').slice(0, 20)).join(' | ')
  console.log(`r${String(i + 1).padStart(3)}: ${compact}`)
}
process.exit(0)
