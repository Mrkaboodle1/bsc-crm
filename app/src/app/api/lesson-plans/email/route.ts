// POST /api/lesson-plans/email { id } — email a lesson plan (PDF) to the parent.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'
import { buildPlanPdf } from '../pdf/route'
import { SIGNATURE_TEXT, emailHtml } from '@/lib/email-signature'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: prof } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!prof?.tenant_id || !['owner', 'manager', 'coach', 'support'].includes(prof.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const admin = createAdminSupabase()
  // Find the parent's email via the plan's student → family.
  const { data: plan } = await admin.from('lesson_plans')
    .select('student:students(first_name, family:families(primary_parent, email))')
    .eq('id', b.id).eq('tenant_id', prof.tenant_id).maybeSingle()
  const stu = plan ? (Array.isArray(plan.student) ? plan.student[0] : plan.student) as { first_name: string; family: { primary_parent: string | null; email: string | null }[] | { primary_parent: string | null; email: string | null } | null } : null
  const fam = stu ? (Array.isArray(stu.family) ? stu.family[0] : stu.family) : null
  const to = fam?.email
  if (!to) return NextResponse.json({ error: 'No parent email on file for this child' }, { status: 400 })

  const pdf = await buildPlanPdf(prof.tenant_id, b.id)
  if (!pdf) return NextResponse.json({ error: 'Plan not found' }, { status: 404 })

  const RESEND = process.env.RESEND_API_KEY
  const FROM = process.env.RESEND_FROM_EMAIL || 'admin@bigstarcircus.com.au'
  const FROM_NAME = process.env.RESEND_FROM_NAME || 'Big Star Circus'
  const REPLY_TO = process.env.RESEND_INBOUND_ADDRESS || process.env.RESEND_REPLY_TO || ''
  if (!RESEND) return NextResponse.json({ error: 'Email not set up' }, { status: 500 })

  const first = (fam?.primary_parent || '').split(' ')[0] || 'there'
  const body = `Hi ${first},\n\nHere's ${pdf.child}'s latest lesson plan and progress from Big Star Circus — attached as a PDF. Any questions, just reply to this email.`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: `${FROM_NAME} <${FROM}>`, to, subject: `${pdf.child}'s lesson plan — Big Star Circus`,
      text: `${body}\n\n${SIGNATURE_TEXT}`, html: emailHtml(body), ...(REPLY_TO ? { reply_to: REPLY_TO } : {}),
      attachments: [{ filename: `lesson-plan-${pdf.date}.pdf`, content: pdf.base64 }],
    }),
  })
  if (!r.ok) return NextResponse.json({ error: 'Could not send email' }, { status: 400 })
  return NextResponse.json({ ok: true, to })
}
