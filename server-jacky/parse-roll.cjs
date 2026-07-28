// Parse the Term 2 roll workbook into a clean structured JSON ("my own
// database copy"), then print a summary. Read-only — writes a JSON file, does
// NOT touch the CRM.  Run:  node parse-roll.cjs
const XLSX = require('xlsx')
const fs = require('fs')
const path = require('path')

const FILE = 'D:/BSC/Student Roll/Bigstar Roll Call Sheets 2026 Term 2.xlsx'
const wb = XLSX.readFile(FILE)

const DAY_SHEETS = [
  { sheet: ' T1 Monday Acro', day: 'Monday' },
  { sheet: 'T1 Tuesday Aerial', day: 'Tuesday' },
  { sheet: 'T1 Wednesday AM HS Circus', day: 'Wednesday' },
  { sheet: 'T1 Wednesday PM Circus', day: 'Wednesday' },
  { sheet: 'T1 Thursday AM HS Circus', day: 'Thursday' },
  { sheet: 'T1 Thursday PM Circus Fusion', day: 'Thursday' },
  { sheet: 'T1 Friday Circus & Aerial', day: 'Friday' },
  { sheet: 'T2 Saturday AM Fusion', day: 'Saturday' },
]

const cellStr = (ws, r, c) => {
  const cell = ws[XLSX.utils.encode_cell({ r, c })]
  return cell && cell.v != null ? String(cell.v).trim() : ''
}

const isStructural = (s) => /^(total kids|total day|child name|coach:|key$|pay style|am$|pm$)/i.test(s)
const looksLikeClassHeader = (s) =>
  /\d{1,2}:\d{2}\s*[-–]\s*\d{1,2}/.test(s) || /^(monday|tuesday|wednesday|thursday|friday|saturday)\b/i.test(s)
const isPrivateHeader = (s) => /privates?\b|private lessons/i.test(s)

const result = { source: FILE, parsedSheets: [], classes: [] }

for (const { sheet, day } of DAY_SHEETS) {
  const ws = wb.Sheets[sheet]
  if (!ws) { result.parsedSheets.push({ sheet, error: 'missing' }); continue }
  const rng = XLSX.utils.decode_range(ws['!ref'])

  // find header row + columns
  let headerRow = -1, col = {}
  for (let R = rng.s.r; R <= Math.min(rng.e.r, rng.s.r + 8); R++) {
    for (let C = rng.s.c; C <= rng.e.c; C++) {
      if (/child name/i.test(cellStr(ws, R, C))) { headerRow = R; break }
    }
    if (headerRow >= 0) break
  }
  if (headerRow < 0) { result.parsedSheets.push({ sheet, error: 'no header' }); continue }
  for (let C = rng.s.c; C <= rng.e.c; C++) {
    const h = cellStr(ws, headerRow, C).toLowerCase()
    if (/child name/.test(h)) col.name = C
    else if (/caregiver/.test(h)) col.care = C
    else if (/special notes/.test(h)) col.notes = C
    else if (/pay style/.test(h)) col.pay = C
    else if (/commitment/.test(h)) col.commit = C
    else if (/date started/.test(h)) col.started = C
  }

  let current = null
  const pushClass = (title, isPrivate) => {
    current = { sheet, day, title: title.replace(/\s+/g, ' ').trim(), isPrivate, coach: '', students: [] }
    result.classes.push(current)
  }

  for (let R = headerRow + 1; R <= rng.e.r; R++) {
    const name = cellStr(ws, R, col.name)
    if (!name) continue
    if (/^coach:/i.test(name)) { if (current) current.coach = name.replace(/^coach:\s*/i, ''); continue }
    if (isStructural(name)) continue
    if (isPrivateHeader(name)) { pushClass(day + ' Private Lessons', true); continue }
    if (looksLikeClassHeader(name) && name.length < 40 && !/\(\d/.test(name)) { pushClass(name, false); continue }
    // otherwise it's a student / private-lesson entry
    if (!current) pushClass(day + ' (unsectioned)', false)
    const entry = {
      raw: name,
      caregiver: col.care != null ? cellStr(ws, R, col.care) : '',
      notes: col.notes != null ? cellStr(ws, R, col.notes) : '',
      pay: col.pay != null ? cellStr(ws, R, col.pay) : '',
      commitment: col.commit != null ? cellStr(ws, R, col.commit) : '',
      started: col.started != null ? cellStr(ws, R, col.started) : '',
    }
    current.students.push(entry)
  }
  result.parsedSheets.push({ sheet, day, headerRow: headerRow + 1, columns: col })
}

// write the structured DB copy
const outDir = path.resolve(__dirname, '../data')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'roll-term2-extracted.json'), JSON.stringify(result, null, 2))

// summary
const privates = result.classes.filter((c) => c.isPrivate)
const groups = result.classes.filter((c) => !c.isPrivate)
const totalEntries = result.classes.reduce((n, c) => n + c.students.length, 0)
console.log(`Parsed ${result.classes.length} class blocks · ${groups.length} group classes · ${privates.length} private blocks · ${totalEntries} entries\n`)
console.log('=== GROUP CLASSES ===')
for (const c of groups) console.log(`  [${c.day}] ${c.title}${c.coach ? ' — coach ' + c.coach.slice(0, 24) : ''}  (${c.students.length})`)
console.log('\n=== PRIVATE LESSON ENTRIES (each → its own class) ===')
for (const c of privates) for (const s of c.students) console.log(`  [${c.day}] ${s.raw}${s.caregiver ? '  · ' + s.caregiver.slice(0, 30) : ''}`)
console.log('\nSaved → data/roll-term2-extracted.json')
