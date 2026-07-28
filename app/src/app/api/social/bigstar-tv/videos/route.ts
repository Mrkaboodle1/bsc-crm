// /api/social/bigstar-tv/videos — list recent video files on this computer so
// Rhett can pick from a dropdown instead of hunting for a file path.
// Looks in the usual places: Dropbox, Downloads, Desktop, Videos, OneDrive.

import { NextResponse } from 'next/server'
import { readdir, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { verifySession, type BscUser } from '@/lib/dal'

export const runtime = 'nodejs'
export const maxDuration = 60

const VIDEO_RE = /\.(mp4|mov|m4v|webm|mkv)$/i
const SKIP_DIRS = /node_modules|\.git|AppData|\$RECYCLE|System Volume/i
const MAX_DEPTH = 3
// Collect broadly, THEN sort by date — capping too early would hide the newest
// footage behind whichever folder happened to be scanned first.
const MAX_FILES = 600

type Found = { path: string; name: string; folder: string; sizeMb: number; modified: number }

async function walk(dir: string, depth: number, out: Found[]): Promise<void> {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return
  let entries
  try { entries = await readdir(dir, { withFileTypes: true }) } catch { return }
  for (const e of entries) {
    if (out.length >= MAX_FILES) return
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (SKIP_DIRS.test(e.name)) continue
      await walk(full, depth + 1, out)
    } else if (VIDEO_RE.test(e.name)) {
      try {
        const s = await stat(full)
        if (s.size < 500_000) continue // skip tiny/broken files
        out.push({
          path: full,
          name: e.name,
          folder: dir.split(/[\\/]/).slice(-1)[0] || dir,
          sizeMb: Math.round(s.size / 1024 / 1024),
          modified: s.mtimeMs,
        })
      } catch { /* unreadable — skip */ }
    }
  }
}

export async function GET() {
  let user: BscUser
  try { user = await verifySession() } catch { return NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  if (user.role === 'parent') return NextResponse.json({ error: 'Staff only' }, { status: 403 })

  const home = homedir()
  const roots = ['Dropbox', 'Downloads', 'Desktop', 'Videos', 'OneDrive']
    .map((d) => join(home, d))
    .filter((d) => existsSync(d))

  const found: Found[] = []
  for (const r of roots) await walk(r, 0, found)

  // Newest first — the footage you just filmed should be at the top.
  found.sort((a, b) => b.modified - a.modified)

  return NextResponse.json({
    ok: true,
    videos: found.slice(0, 40).map((f) => ({
      path: f.path,
      label: `${f.name}  ·  ${f.sizeMb} MB  ·  ${f.folder}`,
    })),
  })
}
