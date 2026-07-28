// /api/waiver-signature?url=... — securely proxies a Tectonic (LeadConnector) signature/
// document image so it can render inside the CRM. Auth'd (signed-in staff only) and
// locked to LeadConnector document URLs. Fetches with the GHL token the browser never sees.
import { NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase-server'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  const supabase = await createServerSupabase()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) return new NextResponse('Unauthorized', { status: 401 })

  const url = new URL(req.url).searchParams.get('url') || ''
  if (!/^https:\/\/services\.leadconnectorhq\.com\/documents\/download\/[\w-]+$/.test(url)) {
    return new NextResponse('Invalid document', { status: 400 })
  }
  const pit = process.env.GHL_PIT
  if (!pit) return new NextResponse('Not configured', { status: 500 })

  const r = await fetch(url, { headers: { Authorization: 'Bearer ' + pit, Version: '2021-07-28' } })
  if (!r.ok) return new NextResponse('Not found', { status: 404 })
  const buf = Buffer.from(await r.arrayBuffer())
  return new NextResponse(buf, { headers: { 'Content-Type': r.headers.get('content-type') || 'image/png', 'Cache-Control': 'private, max-age=86400' } })
}
