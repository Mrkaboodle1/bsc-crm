// Seeds BigStar Radar with the three pilot suburbs: Robina, Nerang, Coomera.
//
// IMPORTANT: only figures I could actually source are filled in. Anything I
// could not verify is left NULL and listed in `needs_confirmation` — the radar
// then shows it as "still needed" and keeps the confidence score honest.
// Run once, after schema/059_bigstar_radar.sql has been applied:
//    node scripts/seed-radar-pilot.mjs
import fs from 'node:fs'

const env = {}
for (const l of fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_]+)=(.*)$/); if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim()
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SK = env.SUPABASE_SERVICE_ROLE_KEY
const T = env.BSC_TENANT_ID || '33c7b22a-52c6-444e-9057-d03d5ed3d94e'
const H = { apikey: SK, Authorization: 'Bearer ' + SK, 'Content-Type': 'application/json' }
const sb = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { ...H, ...(o.headers || {}) } })

const ABS = (label, url) => ({ label, url, checked_on: '2026-07-25' })

const SUBURBS = [
  {
    name: 'Robina', region: 'Gold Coast', postcode: '4226', lga: 'City of Gold Coast',
    population: 64488,                 // id.com.au forecast for 2026
    population_growth_pct: 2.1,        // id.com.au annual growth 2011→2026
    children_5_16: null,               // NEEDS CONFIRMATION — derive from ABS SA2
    distance_km: 17, travel_minutes_pm: null,
    homeschool_activity: null, ndis_activity: null,
    main_problem: 'Gymnastics and dance in Robina skew competitive and selective. Families with kids who want movement without competition, or who are neurodiverse, have few options that fit.',
    bigstar_solution: 'Non-competitive circus: acro, aerial and juggling where effort is celebrated, not ranked. Inclusive by design.',
    marketing_message: 'Circus classes in Robina — build confidence, not competition.',
    launch_program: 'Circus Fusion 5–8 + 9–14, one weekday afternoon',
    opening_offer: 'Founding member: free trial + first 4 weeks at mates rates',
    status: 'research', confidence: 'low',
    sources: [ABS('id.com.au Gold Coast forecast', 'https://www.id.com.au/forecast-review/queensland/gold-coast/'),
              ABS('ABS 2021 Census — Robina West', 'https://abs.gov.au/census/find-census-data/quickstats/2021/309081560'),
              ABS('ABS 2021 Census — Robina East', 'https://abs.gov.au/census/find-census-data/quickstats/2021/309081559')],
    notes: 'ABS 2021: Robina-West 2,547 families (avg 1.6 kids); Robina-East 4,623 families (avg 1.8 kids). Strong school catchment. CONFIRM: 5–16 child count, venue options, afternoon drive time from Molendinar.',
  },
  {
    name: 'Nerang', region: 'Gold Coast', postcode: '4211', lga: 'City of Gold Coast',
    population: 87322,                 // id.com.au forecast for 2026
    population_growth_pct: 2.0,
    children_5_16: null,
    distance_km: 9, travel_minutes_pm: null,
    homeschool_activity: null, ndis_activity: null,
    main_problem: 'Closest suburb to HQ with a big young-family base, but families still drive to Molendinar or Southport for structured movement classes.',
    bigstar_solution: 'A BigStar satellite on their doorstep — same coaches, same program, 10 minutes from HQ so coach travel barely costs us anything.',
    marketing_message: 'BigStar Circus is coming to Nerang — circus, acro and aerial, close to home.',
    launch_program: 'Circus Acro 5–8 + 9–15, two weekday afternoons',
    opening_offer: 'Founding 20: free trial + locked-in rate for 12 months',
    status: 'research', confidence: 'low',
    sources: [ABS('id.com.au Gold Coast forecast', 'https://www.id.com.au/forecast-review/queensland/gold-coast/')],
    notes: 'Growth partly driven by Skyridge Estate. Closest of the three to HQ (~9km) = best coach utilisation. CONFIRM: child population, hall options (Nerang has council & scout halls), competitor density.',
  },
  {
    name: 'Coomera', region: 'Gold Coast', postcode: '4209', lga: 'City of Gold Coast',
    population: null,                  // NEEDS CONFIRMATION
    population_growth_pct: null,
    children_5_16: null,
    distance_km: 22, travel_minutes_pm: null,
    homeschool_activity: null, ndis_activity: null,
    main_problem: 'Fast-growing young-family corridor with new estates. Activity supply has not kept up with the number of new children arriving.',
    bigstar_solution: 'Get in early in a growth corridor — establish BigStar as the circus school before competitors do.',
    marketing_message: 'New to Coomera: BigStar Circus. Something different for kids who don’t love team sport.',
    launch_program: 'Circus Fusion 5–8, one weekday afternoon to start',
    opening_offer: 'Foundation families: free trial + no joining fee',
    status: 'research', confidence: 'low',
    sources: [],
    notes: 'NOT YET RESEARCHED — I could not verify Coomera population or child numbers in the time available. Growth-corridor reputation is well known but must be evidenced before scoring. CONFIRM: population, 5–16 count, new estates, schools, halls, competitors.',
  },
]

const run = async () => {
  const existing = await sb(`expansion_suburbs?select=name&tenant_id=eq.${T}`).then((r) => r.json())
  if (!Array.isArray(existing)) { console.log('Radar tables not found — paste schema/059_bigstar_radar.sql first.'); return }
  const have = new Set(existing.map((s) => s.name.toLowerCase()))

  for (const s of SUBURBS) {
    if (have.has(s.name.toLowerCase())) { console.log(`  skip ${s.name} (already on the radar)`); continue }
    const r = await sb('expansion_suburbs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify([{ tenant_id: T, last_checked: '2026-07-25', ...s }]) })
    console.log(`  ${r.ok ? 'added' : 'FAILED'} ${s.name}${r.ok ? '' : ' — ' + (await r.text()).slice(0, 120)}`)
  }

  // A starter task list per suburb, straight from the playbook.
  const rows = await sb(`expansion_suburbs?select=id,name&tenant_id=eq.${T}`).then((r) => r.json())
  const TASKS = [
    'Confirm children aged 5–16 in catchment (ABS SA2)',
    'Find and list 5 possible venues (halls, churches, scouts, PCYC, school gyms)',
    'Research local competitors + check for waiting lists',
    'Join the local mums / community Facebook groups',
    'Run the organic demand-test post',
    'Measure afternoon drive time from Molendinar HQ',
  ]
  for (const s of rows) {
    const has = await sb(`expansion_tasks?select=id&suburb_id=eq.${s.id}&limit=1`).then((r) => r.json())
    if (Array.isArray(has) && has.length) continue
    for (const t of TASKS) await sb('expansion_tasks', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify([{ tenant_id: T, suburb_id: s.id, title: t }]) })
    console.log(`  + ${TASKS.length} starter tasks for ${s.name}`)
  }
  console.log('\nDone. Open /expansion — scores stay low until the demand tests are run, which is correct.')
}
run()
