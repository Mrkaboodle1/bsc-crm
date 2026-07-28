// /api/social/bigstar-tv/preview?path=... — stream a local video so Rhett can
// WATCH it in the Content Factory before making clips from it.
// Locked down: signed-in staff only, and only files under the user's home
// folder with a video extension (no arbitrary file reads).

import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { resolve, relative, isAbsolute } from 'node:path'
import { homedir } from 'node:os'
import type { ReadableOptions } from 'node:stream'
import { verifySession, type BscUser } from '@/lib/dal'

export const runtime = 'nodejs'

const VIDEO_RE = /\.(mp4|mov|m4v|webm|mkv)$/i
const MIME: Record<string, string> = { mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska' }

function toWebStream(path: string, opts?: ReadableOptions & { start?: number; end?: number }): ReadableStream<Uint8Array> {
  const node = createReadStream(path, opts)
  return new ReadableStream({
    start(controller) {
      node.on('data', (c) => controller.enqueue(new Uint8Array(c as Buffer)))
      node.on('end', () => controller.close())
      node.on('error', (e) => controller.error(e))
    },
    cancel() { node.destroy() },
  })
}

export async function GET(req: NextRequest) {
  let user: BscUser
  try { user = await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  const raw = req.nextUrl.searchParams.get('path') ?? ''
  if (!raw) return NextResponse.json({ error: 'Missing path' }, { status: 400 })

  const path = resolve(raw)
  // Only videos, and only inside the user's own home folder.
  const rel = relative(homedir(), path)
  if (!isAbsolute(path) || rel.startsWith('..') || isAbsolute(rel)) {
    return NextResponse.json({ error: 'That file is outside your home folder' }, { status: 403 })
  }
  if (!VIDEO_RE.test(path)) return NextResponse.json({ error: 'Not a video file' }, { status: 400 })

  let size: number
  try { size = (await stat(path)).size } catch { return NextResponse.json({ error: 'File not found' }, { status: 404 }) }

  const ext = (path.split('.').pop() || 'mp4').toLowerCase()
  const type = MIME[ext] ?? 'video/mp4'
  const range = req.headers.get('range')

  // Range requests let the browser scrub without downloading the whole file.
  if (range) {
    const m = /bytes=(\d*)-(\d*)/.exec(range)
    const start = m && m[1] ? parseInt(m[1], 10) : 0
    const end = m && m[2] ? parseInt(m[2], 10) : Math.min(start + 4_000_000, size - 1)
    if (start >= size) return new NextResponse(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } })
    return new NextResponse(toWebStream(path, { start, end }), {
      status: 206,
      headers: {
        'Content-Type': type,
        'Content-Length': String(end - start + 1),
        'Content-Range': `bytes ${start}-${end}/${size}`,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, max-age=60',
      },
    })
  }

  return new NextResponse(toWebStream(path), {
    headers: { 'Content-Type': type, 'Content-Length': String(size), 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=60' },
  })
}
