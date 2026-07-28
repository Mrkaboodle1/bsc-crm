// GET /api/lesson-plans/pdf?id= — download a lesson plan as a PDF.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { rosterPdfBase64 } from '@/lib/roster-pdf'

export const runtime = 'nodejs'

const niceDate = (d: string) => new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

export async function buildPlanPdf(tenantId: string, id: string) {
  const admin = createAdminSupabase()
  const { data: p } = await admin.from('lesson_plans')
    .select('id, date, title, did, progress, next_focus, student:students(first_name, last_name)')
    .eq('id', id).eq('tenant_id', tenantId).maybeSingle()
  if (!p) return null
  const stu = (Array.isArray(p.student) ? p.student[0] : p.student) as { first_name: string; last_name: string | null } | null
  const child = stu ? `${stu.first_name} ${stu.last_name ?? ''}`.trim() : 'Student'
  const lines: string[] = []
  if (p.title) lines.push(p.title, '')
  lines.push('WHAT WE WORKED ON:', p.did || '—', '')
  lines.push('PROGRESS:', p.progress || '—', '')
  lines.push('NEXT FOCUS / HOMEWORK:', p.next_focus || '—')
  const base64 = await rosterPdfBase64(`${child} — Lesson Plan`, niceDate(p.date), lines)
  return { base64, child, date: p.date }
}

export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: prof } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!prof?.tenant_id || !['owner', 'manager', 'coach', 'support'].includes(prof.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const out = await buildPlanPdf(prof.tenant_id, id)
  if (!out) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const buf = Buffer.from(out.base64, 'base64')
  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="lesson-plan-${out.date}.pdf"` },
  })
}
