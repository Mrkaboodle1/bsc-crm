import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

// GET /api/search?q=... — global search. Matches families by parent name,
// family name, email, ADDRESS and PHONE (any format: 0423..., +61 423...,
// with/without spaces), students by name or DATE OF BIRTH (dd/mm/yyyy),
// and classes by name. Runs on the service-role client scoped to the tenant —
// the RLS client silently returned zero students, which is why searching a
// name looked broken while email appeared to work elsewhere.

export const runtime = 'nodejs'

// Every page in the CRM, searchable by name or plain-English alias — typing
// "incident" or "accident" must take you to Incident Reports, not to nothing.
const PAGES: Array<[label: string, href: string, keywords: string]> = [
  ['Incident Reports', '/incidents', 'incident accident injury report safety near miss first aid'],
  ['Dashboard', '/dashboard', 'home'],
  ['CEO Dashboard', '/ceo', 'targets 650 goals'],
  ['BigStar Radar', '/expansion', 'suburbs venues satellite expansion'],
  ['Contacts', '/contacts', 'families parents phone email'],
  ['Families', '/families', 'family'],
  ['Students', '/students', 'kids children'],
  ['Companies', '/contacts/companies', 'business'],
  ['Classes', '/classes', 'timetable'],
  ['Roll Call', '/roll-call', 'roll attendance marking'],
  ['Staff Roster', '/roster', 'shifts coaches roster'],
  ['Calendar', '/calendar', 'dates'],
  ['Holiday Workshops', '/workshops', 'school holidays workshop'],
  ['Kids Night Out', '/kids-night-out', 'kno night'],
  ['Coach Events', '/coach-portal', 'coach portal days'],
  ['Star Rewards', '/star-rewards', 'stars rewards'],
  ['Star Ledger', '/stars', 'star points'],
  ['Reward Milestones', '/rewards/milestones', 'prizes'],
  ['Leads', '/leads', 'pipeline enquiries'],
  ['Website', '/sites', 'site pages'],
  ['Forms', '/marketing/forms', 'free trial form voucher form'],
  ['Invoices', '/finance/invoices', 'invoice bill money'],
  ['Play On Vouchers', '/finance/vouchers', 'voucher fairplay play on'],
  ['Big Star Books', '/finance/books', 'accounting bookkeeping xero'],
  ['Where We Stand', '/finance/position', 'profit money position'],
  ['Bank & Reconcile', '/finance/bank', 'bank transactions reconcile'],
  ['Payroll & Super', '/finance/payroll', 'wages super payroll'],
  ['Who Owes You', '/finance/owed', 'debtors owed money'],
  ['Reception Till', '/pos', 'till pos sales'],
  ['Memberships', '/memberships', 'subscriptions plans'],
  ['Staff', '/coaches', 'team coaches employees'],
  ['Coach Academy', '/coaching', 'training manual academy'],
  ['Credentials', '/credentials', 'blue card first aid certificates'],
  ['Compliance', '/compliance', 'policies risk'],
  ['Waiver Forms', '/compliance/waivers', 'waiver'],
  ['Signed Waivers', '/compliance/signed-waivers', 'signed waiver'],
  ['Risk Assessments', '/compliance/risk-assessments', 'risk assessment'],
  ['Newsletter', '/marketing/campaigns', 'newsletter email campaign'],
  ['Settings', '/settings', 'setup config'],
]

function phoneVariants(q: string): string[] {
  const digits = q.replace(/\D/g, '')
  if (digits.length < 5) return []
  const out = new Set<string>([digits])
  if (digits.startsWith('0')) out.add('61' + digits.slice(1))
  if (digits.startsWith('61')) out.add('0' + digits.slice(2))
  return [...out]
}

function parseAuDate(q: string): string | null {
  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(q.trim())
  if (!m) return null
  return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
}

export async function GET(req: Request) {
  try {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  // Tell the client WHY there are no results — a silent [] here used to render
  // as "No matches", which reads like broken search when it's really a stale login.
  if (!auth?.user) return NextResponse.json({ results: [], authExpired: true })
  const admin = createAdminSupabase()
  // Admin client for the profile row on purpose: the user id comes from the verified
  // session, and coach-role RLS must never be able to silently blank the whole search.
  const { data: p } = await admin.from('users').select('tenant_id').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return NextResponse.json({ results: [], authExpired: true })

  const raw = new URL(req.url).searchParams.get('q')?.trim() || ''
  if (raw.length < 2) return NextResponse.json({ results: [] })
  // commas and parens would break PostgREST's or() syntax
  const q = raw.replace(/[(),]/g, ' ').trim()
  const like = `*${q}*`
  const T = p.tenant_id

  const famOr: string[] = [
    `family_name.ilike.${like}`,
    `primary_parent.ilike.${like}`,
    `email.ilike.${like}`,
    `address.ilike.${like}`,
  ]
  for (const v of phoneVariants(q)) famOr.push(`phone.ilike.*${v}*`)

  const dob = parseAuDate(raw)
  const kidOr: string[] = [`first_name.ilike.${like}`, `last_name.ilike.${like}`]
  if (dob) kidOr.push(`date_of_birth.eq.${dob}`)

  const [families, students, classes, incidents] = await Promise.all([
    admin.from('families').select('id, family_name, primary_parent, phone, email').eq('tenant_id', T).or(famOr.join(',')).limit(8),
    admin.from('students').select('id, first_name, last_name, date_of_birth, family_id, families(family_name, primary_parent)').eq('tenant_id', T).or(kidOr.join(',')).limit(8),
    admin.from('classes').select('id, name').eq('tenant_id', T).eq('status', 'active').ilike('name', `%${q}%`).limit(5),
    admin.from('incident_reports').select('id, report_no, occurred_on, report_type, children').eq('tenant_id', T)
      .or([`children.ilike.${like}`, `description.ilike.${like}`, `report_no.ilike.${like}`, `location.ilike.${like}`].join(',')).limit(5),
  ])

  type R = { type: string; label: string; sub: string; href: string }
  const results: R[] = []
  const seenFam = new Set<string>()

  // CRM pages first — typing a section's name should always take you there
  const ql = q.toLowerCase()
  for (const [label, href, keywords] of PAGES) {
    if (`${label} ${keywords}`.toLowerCase().includes(ql)) results.push({ type: 'Page', label, sub: 'Open this page', href })
    if (results.length >= 4) break
  }

  for (const f of families.data ?? []) {
    seenFam.add(f.id)
    results.push({ type: 'Contact', label: f.primary_parent || f.family_name || '—', sub: [f.family_name ? `${f.family_name} family` : null, f.phone, f.email].filter(Boolean).join(' · '), href: `/contacts/${f.id}` })
  }
  for (const s of students.data ?? []) {
    const fam = Array.isArray(s.families) ? s.families[0] : s.families
    results.push({ type: 'Student', label: `${s.first_name} ${s.last_name || ''}`.trim(), sub: ['Student', fam?.primary_parent ? `parent: ${fam.primary_parent}` : null, s.date_of_birth ? `b. ${s.date_of_birth}` : null].filter(Boolean).join(' · '), href: `/students/${s.id}` })
    // surfacing the kid's family too — searching a child usually means "find this family"
    if (s.family_id && !seenFam.has(s.family_id)) {
      seenFam.add(s.family_id)
      results.push({ type: 'Contact', label: fam?.primary_parent || fam?.family_name || 'Family', sub: `family of ${s.first_name}`, href: `/contacts/${s.family_id}` })
    }
  }
  for (const c of classes.data ?? []) results.push({ type: 'Class', label: c.name, sub: 'Class — open roll', href: `/roll-call/${c.id}` })
  for (const i of incidents.data ?? []) results.push({ type: 'Incident', label: `${i.report_no} — ${i.children || i.report_type}`, sub: `Incident report · ${i.occurred_on}`, href: '/incidents' })

  return NextResponse.json({ results: results.slice(0, 18) })
  } catch (e) {
    // never let the search die silently — the client shows a "hit a snag" note
    console.error('search failed:', e)
    return NextResponse.json({ results: [], error: 'search-failed' })
  }
}
