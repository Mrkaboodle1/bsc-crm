// Tidy garbled child names on upcoming SHW rolls (mojibake apostrophes + stray
// trailing words/letters left over from Joe's free-text forms).
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url'
const __dir = path.dirname(fileURLToPath(import.meta.url))
const env = fs.readFileSync(path.join(__dir, '..', 'app', '.env.local'), 'utf8')
const g = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const SUPA = g('NEXT_PUBLIC_SUPABASE_URL'), SK = g('SUPABASE_SERVICE_ROLE_KEY')
const sh = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const G = async (u) => (await fetch(SUPA + '/rest/v1' + u, { headers: sh })).json()

function tidy(name) {
  let s = String(name || '')
  s = s.replace(/â€™|â€˜/g, "'").replace(/â(?=[A-Za-z])/g, "'")  // smart-apostrophe mojibake
  s = s.replace(/\s+[-–]\s*.*$/, '')                              // drop " - female - aged" etc.
  s = s.replace(/\s+(old|aged|yo|yrs?|years?|female|male)\b.*$/i, '') // drop trailing age/desc words
  s = s.replace(/\s+[a-z]$/i, '')                                 // drop a lone trailing letter
  s = s.replace(/\s{2,}/g, ' ').trim()
  return s
}

const days = (await G('/holiday_workshops?select=id&date=gte.2026-06-29'))
let fixed = 0
for (const d of days) {
  const rows = await G(`/workshop_attendance?select=id,child_name&workshop_id=eq.${d.id}`)
  for (const r of rows) {
    const t = tidy(r.child_name)
    if (t && t !== r.child_name) {
      await fetch(`${SUPA}/rest/v1/workshop_attendance?id=eq.${r.id}`, { method: 'PATCH', headers: { ...sh, Prefer: 'return=minimal' }, body: JSON.stringify({ child_name: t }) })
      console.log(`"${r.child_name}"  ->  "${t}"`)
      fixed++
    }
  }
}
console.log(`\nTidied ${fixed} names.`)
