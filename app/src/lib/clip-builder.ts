// clip-builder.ts — the HANDS of the Big Star TV engine.
// Takes a moment Gemini found and renders a finished vertical clip with the
// hook burned on top, a CTA end-band, and optional royalty-free music.
//
// Requires ffmpeg on the machine running this (installed 18 Jul 2026).
// Music: drop royalty-free .mp3/.m4a files into public/bigstar-music/ and the
// engine picks one per clip. No files = original class audio is kept (safe).

import 'server-only'
import { spawn } from 'node:child_process'
import { readdir, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { VideoMoment } from './gemini-video'

// FFmpeg's drawtext needs an explicit font file on Windows (no fontconfig) —
// without this the whole render fails with "Cannot load default config file".
// Bold, wide faces read best as social captions. Linux paths included so this
// still works when the engine moves to the server.
const FONT_CANDIDATES = [
  'C:/Windows/Fonts/ariblk.ttf',      // Arial Black — best for social
  'C:/Windows/Fonts/impact.ttf',
  'C:/Windows/Fonts/arialbd.ttf',
  'C:/Windows/Fonts/segoeuib.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
]
let cachedFont: string | null | undefined
function fontFile(): string | null {
  if (cachedFont !== undefined) return cachedFont
  cachedFont = FONT_CANDIDATES.find((p) => existsSync(p)) ?? null
  return cachedFont
}
// drawtext wants forward slashes and an escaped drive colon on Windows.
function fontArg(): string {
  const f = fontFile()
  return f ? `:fontfile='${f.replace(/\\/g, '/').replace(/:/g, '\\:')}'` : ''
}

const MUSIC_DIR = join(process.cwd(), 'public', 'bigstar-music')
export const CLIPS_DIR = join(process.cwd(), 'public', 'bigstar-clips')

function run(cmd: string, args: string[], timeoutMs = 240_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true })
    let err = ''
    p.stderr.on('data', (d) => { err += String(d) })
    const t = setTimeout(() => { p.kill(); reject(new Error('Rendering timed out')) }, timeoutMs)
    p.on('error', (e) => {
      clearTimeout(t)
      const isMissing = (e as NodeJS.ErrnoException).code === 'ENOENT'
      reject(new Error(isMissing ? 'The video tool (FFmpeg) isn’t installed on this machine.' : e.message))
    })
    p.on('close', (code) => {
      clearTimeout(t)
      code === 0 ? resolve() : reject(new Error(err.split('\n').slice(-4).join(' ').slice(0, 300) || `ffmpeg exited ${code}`))
    })
  })
}

export type AudioMode = 'original' | 'music' | 'both'

/**
 * Pick a royalty-free track. If Rhett described a vibe ("energetic circus,
 * funny"), score each filename against those words so naming tracks well
 * ("energetic-circus-fun.mp3") actually steers the choice.
 */
async function pickMusic(index: number, vibe?: string): Promise<string | null> {
  try {
    const files = (await readdir(MUSIC_DIR)).filter((f) => /\.(mp3|m4a|aac|wav)$/i.test(f))
    if (!files.length) return null

    const words = (vibe || '').toLowerCase().match(/[a-z]{3,}/g) ?? []
    if (words.length) {
      const scored = files
        .map((f) => ({ f, score: words.filter((w) => f.toLowerCase().includes(w)).length }))
        .sort((a, b) => b.score - a.score)
      if (scored[0].score > 0) {
        // Rotate among equally-good matches so clips don't all share one track.
        const best = scored.filter((s) => s.score === scored[0].score)
        return join(MUSIC_DIR, best[index % best.length].f)
      }
    }
    return join(MUSIC_DIR, files[index % files.length])
  } catch { return null }
}

/** List the music library so the UI can show what's available. */
export async function listMusic(): Promise<string[]> {
  try { return (await readdir(MUSIC_DIR)).filter((f) => /\.(mp3|m4a|aac|wav)$/i.test(f)) } catch { return [] }
}

// FFmpeg drawtext is picky — escape the characters that break it.
function esc(s: string): string {
  return s.replace(/\\/g, '').replace(/:/g, '\\:').replace(/'/g, "’").replace(/%/g, '').replace(/"/g, '')
}

// Wrap a hook onto max 2 lines so it never runs off a phone screen.
function wrap(text: string, perLine = 20): string {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    if ((line + ' ' + w).trim().length > perLine && line) { lines.push(line.trim()); line = w }
    else line = (line + ' ' + w).trim()
  }
  if (line) lines.push(line)
  return lines.slice(0, 3).join('\n')
}

export type BuiltClip = { fileName: string; publicPath: string; durationSec: number }

/**
 * Render one finished clip: cut → vertical 1080x1920 → hook overlay (first 3.5s)
 * → CTA band (last 3s) → optional royalty-free music bed.
 */
export async function buildClip(opts: {
  sourcePath: string
  moment: VideoMoment
  index: number
  audioMode: AudioMode
  musicVibe?: string
}): Promise<BuiltClip> {
  await mkdir(CLIPS_DIR, { recursive: true })

  const { moment, index, audioMode } = opts
  const duration = Math.max(4, Math.min(60, moment.end - moment.start))
  const fileName = `clip-${Date.now()}-${index}.mp4`
  const outPath = join(CLIPS_DIR, fileName)
  const music = audioMode === 'original' ? null : await pickMusic(index, opts.musicVibe)

  // Scale/pad to a clean 9:16 canvas (source is usually already vertical).
  const video = [
    `scale=1080:1920:force_original_aspect_ratio=increase`,
    `crop=1080:1920`,
    // Hook — big, bold, top third, with a shadow so it reads on any footage.
    moment.hook
      ? `drawtext=text='${esc(wrap(moment.hook))}'${fontArg()}:fontcolor=white:fontsize=76:borderw=6:bordercolor=black@0.85:line_spacing=12:x=(w-text_w)/2:y=h*0.13:enable='between(t,0.3,3.8)'`
      : null,
    // CTA — band across the lower third at the end.
    moment.cta
      ? `drawtext=text='${esc(wrap(moment.cta, 24))}'${fontArg()}:fontcolor=white:fontsize=56:borderw=5:bordercolor=black@0.85:box=1:boxcolor=0xD72027@0.85:boxborderw=22:x=(w-text_w)/2:y=h*0.76:enable='gte(t,${Math.max(1, duration - 3).toFixed(2)})'`
      : null,
  ].filter(Boolean).join(',')

  const args = ['-y', '-ss', String(moment.start), '-t', String(duration), '-i', opts.sourcePath]
  if (music) args.push('-i', music)

  const fadeOut = `afade=t=out:st=${Math.max(0, duration - 2).toFixed(2)}:d=2`

  if (music && audioMode === 'music') {
    // MUSIC ONLY — the class audio is dropped entirely, so nothing clashes.
    args.push('-filter_complex', `[0:v]${video}[v];[1:a]volume=0.85,${fadeOut}[a]`, '-map', '[v]', '-map', '[a]')
  } else if (music) {
    // BOTH — music sits well under the real sound so cheers still come through.
    args.push(
      '-filter_complex',
      `[0:v]${video}[v];[0:a]volume=1.0[a0];[1:a]volume=0.22,${fadeOut}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=0,dynaudnorm[a]`,
      '-map', '[v]', '-map', '[a]',
    )
  } else {
    // ORIGINAL — just the real class sound.
    args.push('-filter_complex', `[0:v]${video}[v]`, '-map', '[v]', '-map', '0:a?')
  }

  args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', outPath)

  await run('ffmpeg', args)
  return { fileName, publicPath: `/bigstar-clips/${fileName}`, durationSec: duration }
}
