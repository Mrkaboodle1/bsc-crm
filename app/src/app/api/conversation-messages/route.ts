import { NextResponse } from 'next/server'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

// GET /api/conversation-messages?id=<conversationId> — the message history for
// one imported thread, oldest first.
export async function GET(req: Request) {
  const user = await verifySession()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  const admin = createAdminSupabase()

  // Confirm the thread belongs to this tenant before returning anything.
  const { data: convo } = await admin.from('conversations').select('id').eq('id', id).eq('tenant_id', user.tenantId).maybeSingle()
  if (!convo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data } = await admin
    .from('conversation_messages')
    .select('id, direction, channel, body, sent_at')
    .eq('conversation_id', id)
    .order('sent_at', { ascending: true, nullsFirst: true })
    .limit(200)

  return NextResponse.json({ ok: true, messages: data ?? [] })
}
