import 'server-only'
import type { createAdminSupabase } from '@/lib/supabase-admin'

type Admin = ReturnType<typeof createAdminSupabase>

// Attach each voucher kid's real class enrolments so the voucher tracker
// answers "which classes is this child actually attending?" at a glance.
// Matching is deliberately conservative: first name (+ family when we have it,
// + surname as tie-breaker) and only when exactly ONE student matches — we
// never guess a child's classes across same-named kids.
export async function attachVoucherClasses<T extends { family_id: string | null; student_name: string | null }>(
  admin: Admin, tenantId: string, rows: T[],
): Promise<Array<T & { classes: string[] }>> {
  const out = rows.map((r) => ({ ...r, classes: [] as string[] }))
  const firsts = [...new Set(
    rows.map((r) => String(r.student_name || '').trim().split(/\s+/)[0])
      .filter(Boolean).map((f) => f.replace(/[(),]/g, '')),
  )]
  if (!firsts.length) return out

  const { data: byName } = await admin.from('students')
    .select('id, first_name, last_name, family_id')
    .eq('tenant_id', tenantId)
    .or(firsts.map((f) => `first_name.ilike.${f}`).join(','))

  // Also pull every child of the matched families. Government vouchers spell
  // names their own way ("Bronte J Bishop" vs our "Bronti Bishop"), and some
  // vouchers get logged with only a surname — a first-name-only lookup misses
  // those kids and wrongly flags them as "not on a class roll".
  const famIds = [...new Set(rows.map((r) => r.family_id).filter(Boolean))] as string[]
  let byFamily: NonNullable<typeof byName> = []
  if (famIds.length) {
    const { data } = await admin.from('students')
      .select('id, first_name, last_name, family_id')
      .eq('tenant_id', tenantId).in('family_id', famIds)
    byFamily = data ?? []
  }
  const seen = new Set<string>()
  const students = [...(byName ?? []), ...byFamily].filter((s) => !seen.has(s.id) && seen.add(s.id))
  if (!students.length) return out

  const { data: enr } = await admin.from('enrolments')
    .select('student_id, status, end_date, classes(name)')
    .eq('tenant_id', tenantId)
    .in('student_id', students.map((s) => s.id))

  const today = new Date().toISOString().slice(0, 10)
  const byStudent = new Map<string, string[]>()
  for (const e of enr ?? []) {
    if (e.status && !['active', 'trial'].includes(String(e.status))) continue
    if (e.end_date && String(e.end_date) < today) continue
    const cls = Array.isArray(e.classes) ? e.classes[0] : e.classes
    if (!cls?.name) continue
    const list = byStudent.get(e.student_id) ?? []
    if (!list.includes(cls.name)) list.push(cls.name)
    byStudent.set(e.student_id, list)
  }

  // "Bronte" vs "Bronti", "Zach" vs "Zack" — same child, one letter apart.
  const close = (a: string, b: string) => {
    if (!a || !b) return false
    if (a === b) return true
    if (Math.abs(a.length - b.length) > 1) return false
    if (a.length >= 4 && b.length >= 4 && a.slice(0, 4) === b.slice(0, 4)) return true
    let diff = 0, i = 0, j = 0
    while (i < a.length && j < b.length) {
      if (a[i] === b[j]) { i++; j++; continue }
      if (++diff > 1) return false
      if (a.length > b.length) i++
      else if (b.length > a.length) j++
      else { i++; j++ }
    }
    return diff + (a.length - i) + (b.length - j) <= 1
  }

  for (const r of out) {
    const parts = String(r.student_name || '').trim().split(/\s+/)
    const first = (parts[0] || '').toLowerCase()
    const last = (parts.length > 1 ? parts[parts.length - 1] : '').toLowerCase()
    if (!first) continue
    let cands = students.filter((s) => (s.first_name || '').toLowerCase() === first)

    // Inside the voucher's family, also accept near-miss spellings — the
    // government spells names its own way ("Bronte J Bishop" vs our "Bronti
    // Bishop") — and surname-only vouchers (some get logged as just "Forno").
    // These go in ALONGSIDE the exact matches, because a family can hold both
    // a duplicate empty record and the real enrolled child.
    if (r.family_id) {
      const fam = students.filter((s) => s.family_id === r.family_id)
      const extra = fam.filter((s) =>
        close((s.first_name || '').toLowerCase(), first) ||
        (s.last_name || '').toLowerCase() === first ||
        (!!last && (s.last_name || '').toLowerCase() === last))
      for (const s of extra) if (!cands.some((c) => c.id === s.id)) cands.push(s)
      if (!cands.length && fam.length === 1) cands = fam
      const inFam = cands.filter((s) => s.family_id === r.family_id)
      if (inFam.length) cands = inFam
    }
    if (cands.length > 1 && last) {
      const ln = cands.filter((s) => (s.last_name || '').toLowerCase() === last)
      if (ln.length) cands = ln
    }
    // Same first name twice in one family with no surname to split them —
    // prefer the one that's actually enrolled rather than an empty duplicate.
    if (cands.length > 1) {
      const enrolled = cands.filter((s) => (byStudent.get(s.id) ?? []).length)
      if (enrolled.length === 1) cands = enrolled
    }
    if (cands.length === 1) r.classes = byStudent.get(cands[0].id) ?? []
  }
  return out
}
