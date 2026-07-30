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
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ results: [] })
  const { data: p } = await supabase.from('users').select('tenant_id').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id) return NextResponse.json({ results: [] })

  const raw = new URL(req.url).searchParams.get('q')?.trim() || ''
  if (raw.length < 2) return NextResponse.json({ results: [] })
  // commas and parens would break PostgREST's or() syntax
  const q = raw.replace(/[(),]/g, ' ').trim()
  const like = `*${q}*`
  const admin = createAdminSupabase()
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

  const [families, students, classes] = await Promise.all([
    admin.from('families').select('id, family_name, primary_parent, phone, email').eq('tenant_id', T).or(famOr.join(',')).limit(8),
    admin.from('students').select('id, first_name, last_name, date_of_birth, family_id, families(family_name, primary_parent)').eq('tenant_id', T).or(kidOr.join(',')).limit(8),
    admin.from('classes').select('id, name').eq('tenant_id', T).eq('status', 'active').ilike('name', `%${q}%`).limit(5),
  ])

  type R = { type: string; label: string; sub: string; href: string }
  const results: R[] = []
  const seenFam = new Set<string>()

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

  return NextResponse.json({ results: results.slice(0, 15) })
}
