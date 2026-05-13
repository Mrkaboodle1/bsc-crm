// Server-side proxy for AI-generated images. Calls Pollinations.ai, returns
// the image bytes back to the client. Adds caching so repeated views of the
// same prompt+seed don't hit Pollinations again.

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const prompt = sp.get('prompt')
  const seed = sp.get('seed') ?? '1'
  const width = sp.get('width') ?? '1080'
  const height = sp.get('height') ?? '1080'

  if (!prompt || prompt.length < 2) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 })
  }
  if (prompt.length > 1000) {
    return NextResponse.json({ error: 'Prompt too long' }, { status: 400 })
  }

  const upstream = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&model=flux&nologo=true`

  try {
    const r = await fetch(upstream, {
      // Long timeout — flux model can take 20-30 seconds
      signal: AbortSignal.timeout(60_000),
      headers: { 'User-Agent': 'BSC-CRM/0.1 (+https://bigstarcircus.com.au)' },
    })

    if (!r.ok) {
      return NextResponse.json(
        { error: `Pollinations returned ${r.status}` },
        { status: 502 }
      )
    }

    // Stream back — pass through content-type
    const ct = r.headers.get('content-type') ?? 'image/jpeg'
    const buf = await r.arrayBuffer()

    return new NextResponse(buf, {
      status: 200,
      headers: {
        'content-type': ct,
        'cache-control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
        'x-bsc-source': 'pollinations.ai',
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: `Fetch failed: ${msg}` }, { status: 504 })
  }
}
