// TEMP probe — inspect existing tables for the Coach Academy build. Delete after.
import fs from 'node:fs'

const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY
const H = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }

const r = await fetch(`${SB}/rest/v1/`, { headers: H })
const spec = await r.json()
for (const t of ['trainee_logbook', 'form_submissions', 'coaches', 'coach_documents']) {
  const d = spec.definitions?.[t]
  console.log(`\n### ${t}`)
  if (!d) { console.log('not in spec'); continue }
  for (const [k, v] of Object.entries(d.properties ?? {})) {
    console.log(`  ${k}: ${v.format ?? v.type}${v.default !== undefined ? ` default=${v.default}` : ''}${d.required?.includes(k) ? ' REQUIRED' : ''} ${v.description ? '// ' + v.description.replace(/\n/g, ' ') : ''}`)
  }
}
