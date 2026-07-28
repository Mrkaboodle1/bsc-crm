import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

async function guard() {
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) return null
  return user
}

// Seeded the first time so Rhett always has starting question sets to edit.
const DEFAULTS: Array<{ name: string; questions: string[] }> = [
  { name: 'Coach', questions: [
    'Why do you coach children?',
    'Describe a child you helped.',
    'How would parents describe you?',
    'How would children describe you?',
    'How would you respond to a child refusing to participate?',
    'Tell me about a coaching mistake.',
    'Which excites you more — winning competitions, or helping children become confident?',
    'Scenario: Imagine 20 children, it’s raining, one child has autism, one child has ADHD, a child is crying, one parent is watching, and another child has hurt themselves. Walk us through exactly how you would manage this class.',
  ] },
  { name: 'Admin', questions: [
    'Why do you want to work at BigStar Circus?',
    'Tell me about a time you delivered great customer service.',
    'How do you handle an upset or worried parent?',
    'How comfortable are you with computers, systems and learning new software?',
    'How do you stay organised when it’s busy?',
    'Tell me about a time you handled confidential information.',
    'How would your last team describe you?',
  ] },
  { name: 'Volunteer', questions: [
    'What made you want to volunteer with BigStar Circus?',
    'How do you feel about working around children?',
    'What are you hoping to get out of this experience?',
    'Tell me about your reliability — can we count on you each week?',
    'Is there anything we can do to support you while you’re here?',
    'How do you handle a busy or noisy environment?',
  ] },
]

export async function GET() {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const admin = createAdminSupabase()
  let { data } = await admin.from('interview_templates').select('id, name, questions').eq('tenant_id', user.tenantId).order('created_at')
  if (!data || data.length === 0) {
    for (const t of DEFAULTS) await admin.from('interview_templates').insert({ tenant_id: user.tenantId, name: t.name, questions: t.questions })
    const re = await admin.from('interview_templates').select('id, name, questions').eq('tenant_id', user.tenantId).order('created_at')
    data = re.data ?? []
  }
  return NextResponse.json({ ok: true, rows: data })
}

// Save a template (create or update its questions / name)
export async function PUT(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const b = await req.json().catch(() => ({}))
  if (!b.name?.trim()) return NextResponse.json({ error: 'Template needs a name' }, { status: 400 })
  const admin = createAdminSupabase()
  const questions = Array.isArray(b.questions) ? b.questions.filter((q: unknown) => typeof q === 'string' && q.trim()) : []
  if (b.id) {
    const { data, error } = await admin.from('interview_templates').update({ name: b.name.trim(), questions, updated_at: new Date().toISOString() }).eq('id', b.id).eq('tenant_id', user.tenantId).select('id, name, questions').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true, row: data })
  }
  const { data, error } = await admin.from('interview_templates').insert({ tenant_id: user.tenantId, name: b.name.trim(), questions }).select('id, name, questions').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true, row: data })
}

export async function DELETE(req: Request) {
  const user = await guard(); if (!user) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()
  await admin.from('interview_templates').delete().eq('id', id).eq('tenant_id', user.tenantId)
  return NextResponse.json({ ok: true })
}
