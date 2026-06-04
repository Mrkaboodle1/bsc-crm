import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// GET /api/search?q=... — quick global search across students, families, classes.
export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ results: [] })

  const q = new URL(req.url).searchParams.get('q')?.trim() || ''
  if (q.length < 2) return NextResponse.json({ results: [] })
  const like = `*${q}*`

  const [students, families, classes] = await Promise.all([
    supabase.from('students').select('id, first_name, last_name').or(`first_name.ilike.${like},last_name.ilike.${like}`).limit(6),
    supabase.from('families').select('id, family_name, primary_parent').or(`family_name.ilike.${like},primary_parent.ilike.${like}`).limit(6),
    supabase.from('classes').select('id, name').ilike('name', like).eq('status', 'active').limit(5),
  ])

  type R = { type: string; label: string; sub: string; href: string }
  const results: R[] = []
  for (const s of students.data ?? []) results.push({ type: 'Student', label: `${s.first_name} ${s.last_name || ''}`.trim(), sub: 'Student', href: `/students/${s.id}` })
  for (const f of families.data ?? []) results.push({ type: 'Family', label: f.family_name || 'Family', sub: f.primary_parent || 'Family', href: `/families/${f.id}` })
  for (const c of classes.data ?? []) results.push({ type: 'Class', label: c.name, sub: 'Class', href: `/roll-call/${c.id}` })

  return NextResponse.json({ results: results.slice(0, 12) })
}
