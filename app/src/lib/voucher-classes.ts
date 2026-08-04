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

  const { data: students } = await admin.from('students')
    .select('id, first_name, last_name, family_id')
    .eq('tenant_id', tenantId)
    .or(firsts.map((f) => `first_name.ilike.${f}`).join(','))
  if (!students?.length) return out

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

  for (const r of out) {
    const parts = String(r.student_name || '').trim().split(/\s+/)
    const first = (parts[0] || '').toLowerCase()
    const last = (parts.length > 1 ? parts[parts.length - 1] : '').toLowerCase()
    if (!first) continue
    let cands = students.filter((s) => (s.first_name || '').toLowerCase() === first)
    if (r.family_id) {
      const fam = cands.filter((s) => s.family_id === r.family_id)
      if (fam.length) cands = fam
    }
    if (cands.length > 1 && last) {
      const ln = cands.filter((s) => (s.last_name || '').toLowerCase() === last)
      if (ln.length) cands = ln
    }
    if (cands.length === 1) r.classes = byStudent.get(cands[0].id) ?? []
  }
  return out
}
