#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { read, utils } from 'xlsx'

const file = 'C:/Users/Rhett Morrow/my-assistant/crm/Bigstar Roll Call Sheets 2026 Term 2.xlsx'
const wb = read(readFileSync(file))
const out: string[] = []

// 1. distinct commitment values
const distinct = new Set<string>()
for (const name of wb.SheetNames) {
  const data = utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, defval: '', raw: false })
  for (const row of data) {
    const c = String(row[1] ?? '').trim()
    if (c && c.length < 30) distinct.add(c)
  }
}
out.push('=== Distinct commitment values (col B) ===')
for (const v of [...distinct].sort()) out.push('  ' + v)

// 2. search for voucher / playon / fairplay
out.push('\n=== Voucher / Play On hits ===')
for (const name of wb.SheetNames) {
  const data = utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, defval: '', raw: false })
  for (let r = 0; r < data.length; r++) {
    const row = data[r] as unknown[]
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').toLowerCase()
      if (cell.includes('play on') || cell.includes('playon') || cell.includes('voucher') || cell.includes('fairplay')) {
        out.push(`  [${name}] r${r + 1}c${c + 1}: ${row[c]}`)
      }
    }
  }
}

// 3. for each sheet, find the row that contains "CHILD NAME" (a column header)
out.push('\n=== "CHILD NAME" column locations ===')
for (const name of wb.SheetNames) {
  const data = utils.sheet_to_json<unknown[]>(wb.Sheets[name]!, { header: 1, defval: '', raw: false })
  for (let r = 0; r < Math.min(data.length, 10); r++) {
    const row = data[r] as unknown[]
    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c] ?? '').toLowerCase()
      if (cell.includes('child name') || cell.includes('child') && cell.includes('name')) {
        out.push(`  [${name}] r${r + 1}c${c + 1}: "${row[c]}"`)
      }
    }
  }
}

writeFileSync('rollsheet-explore-output.txt', out.join('\n'))
console.log('done — wrote', out.length, 'lines to rollsheet-explore-output.txt')
