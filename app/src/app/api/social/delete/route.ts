import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

// POST /api/social/delete { id } — soft-delete a planned/posted social post.
export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await supabase.from('posted_media').update({ status: 'deleted' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
