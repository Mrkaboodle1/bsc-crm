// POST /api/upload — uploads an image from the user's computer to Supabase
// Storage and returns a public URL (usable in emails + Instagram/Facebook posts).
// Owner/manager only. multipart/form-data with a "file" field.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'
const MAX = 10 * 1024 * 1024 // 10 MB
const OK = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']

export async function POST(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 })
  const { data: p } = await supabase.from('users').select('tenant_id, role').eq('id', auth.user.id).maybeSingle()
  if (!p?.tenant_id || !['owner', 'manager'].includes(p.role)) return NextResponse.json({ error: 'Not allowed' }, { status: 403 })

  let file: File | null = null
  try { const form = await req.formData(); file = form.get('file') as File | null } catch { /* ignore */ }
  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
  if (!OK.includes(file.type)) return NextResponse.json({ error: 'Please upload a JPG, PNG, WEBP or GIF image, or a PDF.' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ error: 'File is too big (max 10 MB).' }, { status: 400 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `${p.tenant_id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const admin = createAdminSupabase()
  const { error } = await admin.storage.from('marketing').upload(path, file, { contentType: file.type, upsert: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  const { data } = admin.storage.from('marketing').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
