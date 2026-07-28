import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const env = readFileSync(resolve(__dirname, '../server-jacky/.env'), 'utf8')
const get = (k) => (env.match(new RegExp('^' + k + '=(.*)$', 'm')) || [])[1]?.trim()
const BASE = get('SUPABASE_URL')
const KEY = get('SUPABASE_SERVICE_ROLE_KEY')
const h = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' }

const id = (() => { let n = 0; return () => `f${++n}` })()
const F = {
  name: (label = 'Parent name', required = true) => ({ id: id(), type: 'short_text', label, required }),
  email: (required = true) => ({ id: id(), type: 'email', label: 'Email', required }),
  phone: (required = true) => ({ id: id(), type: 'phone', label: 'Phone', required }),
  text: (label, required = false) => ({ id: id(), type: 'short_text', label, required }),
  long: (label, required = false) => ({ id: id(), type: 'long_text', label, required }),
  checks: (label, options, required = false) => ({ id: id(), type: 'checkboxes', label, options, required }),
  heading: (label) => ({ id: id(), type: 'heading', label }),
  consent: (label, placeholder, required = true) => ({ id: id(), type: 'consent', label, placeholder, required }),
}

const FORMS = [
  {
    name: 'Free Trial', slug: 'free-trial',
    intro: 'Try 3 classes for free! Pop your details in and we’ll lock in a trial that suits your child.',
    fields: [
      F.name('Parent first name'), F.name('Parent last name'), F.email(), F.phone(),
      F.text('Address'), F.text('Child name & age', true), F.text('Second child name & age'),
      F.long('Medical info'), F.long('What are your goals? (flexibility / fun / friends / competitions)'),
      F.heading('Which classes are you interested in?'),
      F.checks('Monday — Circus Acro', ['3:45–4:45pm (5–7yr)', '4:45–5:45pm (8–10yr)', '5:45–6:45pm (9–14yr)']),
      F.checks('Tuesday — Aerial', ['Jr Aerial 3:45–4:45pm (5–8yr)', 'Sr Aerial 5–6pm (9–14yr)', 'Adult Aerial 6:15–7:15pm']),
      F.checks('Wednesday — Homeschool / Circus', ['Homeschool Acro 9:30', 'Homeschool Circus 10:30', 'Homeschool Aerial 11:30', 'Circus Fusion 3:45 (5–8)', 'Circus Fusion 4:45 (9–14)']),
      F.checks('Friday — Drama', ['Drama 3:45–4:45pm (5–8yr)', 'Drama 4:45–5:45pm (9–14yr)']),
      F.checks('Saturday — Circus', ['Circus Fusion 9:00–10:00am (6–8yr)', 'Circus Fusion 10:00–11:00am (9–15yr)']),
    ],
  },
  {
    name: 'Contact', slug: 'contact',
    intro: 'Have a question? Send us a message and we’ll get straight back to you.',
    fields: [F.name('First name'), F.name('Last name'), F.phone(), F.email(), F.long('Comment'),
      F.consent('SMS consent', 'I consent to receive SMS notifications, alerts & occasional marketing. Reply STOP to unsubscribe.', false)],
  },
  {
    name: 'Kids Night Out Waiver', slug: 'kids-night-out',
    intro: 'Book your child in for Kids Night Out and complete the waiver below.',
    fields: [
      F.name('First name'), F.name('Last name'), F.phone(), F.email(),
      F.text('All children attending — names and ages', true),
      F.checks('Pizza', ['Hawaiian', 'Pepperoni', 'Cheese', 'Gluten free'], true),
      F.text('Allergies or dietary restrictions', true),
      F.heading('Waiver'),
      F.consent('SMS consent', 'I consent to receive SMS notifications, alerts & occasional marketing.'),
      F.consent('Late pickup agreement', 'I understand a $80 late fee applies after 9:30pm and $150 after 10:00pm.'),
      F.consent('Refund & cancellation policy', 'No refunds for cancellations, but my child’s spot may transfer to the next Kids Night Out.'),
      F.consent('Liability waiver', 'I have read and agree to the BigStar Circus liability waiver & media release.'),
    ],
  },
  {
    name: 'School Holiday Workshop', slug: 'school-holiday',
    intro: 'Book your child into our school-holiday workshops (9am–3pm).',
    fields: [
      F.name(), F.phone(), F.email(), F.text('Emergency contact name & number', true),
      F.text('Child 1 name & age', true), F.text('Child 2 name & age'), F.text('Child 3 name & age'),
      F.long('Medical conditions / allergies'),
      F.heading('Select days (AU$60 each)'),
      F.checks('Days required', ['Mon 29 Jun', 'Tue 30 Jun', 'Wed 1 Jul', 'Thu 2 Jul', 'Fri 3 Jul', 'Tue 7 Jul', 'Wed 8 Jul', 'Thu 9 Jul', 'Fri 10 Jul'], true),
      F.heading('Waiver'),
      F.consent('Liability waiver', 'I have read and agree to the BigStar Circus liability waiver & media release.'),
      F.consent('Agreements', 'I consent to SMS; I understand the late-pickup and refund/cancellation policies.'),
    ],
  },
]

const tenant = (await (await fetch(`${BASE}/rest/v1/tenants?select=id&slug=eq.bigstarcircus`, { headers: h })).json())[0]
if (!tenant) { console.error('no tenant'); process.exit(1) }

for (const f of FORMS) {
  const existing = await (await fetch(`${BASE}/rest/v1/forms?select=id&tenant_id=eq.${tenant.id}&slug=eq.${f.slug}`, { headers: h })).json()
  if (existing[0]) { console.log(`skip (exists): ${f.slug}`); continue }
  const r = await fetch(`${BASE}/rest/v1/forms`, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify({ tenant_id: tenant.id, name: f.name, slug: f.slug, intro: f.intro, fields: f.fields }) })
  console.log(r.ok ? `created: ${f.slug}` : `FAIL ${f.slug}: ${await r.text()}`)
}
console.log('done')
