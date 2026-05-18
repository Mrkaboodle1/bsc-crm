// Render all 11 training-module videos as MP4 files.
// Usage: node scripts/render-all.mjs [--id <module-id>] [--force]
//
// For each module we:
//   1. Probe the MP3 file's duration in seconds.
//   2. Compute frames = ceil((duration + 0.7s) * FPS) so there's a tiny tail
//      after Jacky finishes (avoids cutting off her last word).
//   3. Pass that duration in via inputProps so the composition runs the
//      exact length of the audio. No frozen silence at the end.

import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition, getCompositions } from '@remotion/renderer'
import { getAudioDurationInSeconds } from '@remotion/media-utils'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { mkdir, stat } from 'node:fs/promises'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const ENTRY = path.join(PROJECT_ROOT, 'src', 'index.ts')
const OUT_DIR = path.resolve(PROJECT_ROOT, '..', 'app', 'public', 'training', 'video')
const AUDIO_DIR = path.join(PROJECT_ROOT, 'public')

const FPS = 30

const args = process.argv.slice(2)
const force = args.includes('--force')
const idIdx = args.indexOf('--id')
const onlyId = idIdx >= 0 ? args[idIdx + 1] : null

async function main() {
  console.log('📦 Bundling…')
  const serveUrl = await bundle({
    entryPoint: ENTRY,
    webpackOverride: (cfg) => cfg,
  })
  console.log('   ↳ bundled')

  await mkdir(OUT_DIR, { recursive: true })

  const compositions = await getCompositions(serveUrl)
  const targets = compositions.filter((c) => (onlyId ? c.id === onlyId : true))
  if (targets.length === 0) {
    throw new Error(`No compositions matched (id=${onlyId ?? 'all'})`)
  }
  console.log(`Found ${targets.length} composition(s) to render: ${targets.map((c) => c.id).join(', ')}`)

  for (const comp of targets) {
    const outPath = path.join(OUT_DIR, `${comp.id}.mp4`)
    if (!force) {
      try {
        const s = await stat(outPath)
        if (s.size > 0) {
          console.log(`⏭  ${comp.id} — already rendered (${(s.size / 1024 / 1024).toFixed(1)} MB), skipping`)
          continue
        }
      } catch {}
    }

    // Probe the audio file directly from disk via a file:// URL — works in
    // Node without needing the Next.js dev server or HTTP probe.
    const audioPath = path.join(AUDIO_DIR, `${comp.id}.mp3`)
    let audioSeconds = 60
    try {
      audioSeconds = await getAudioDurationInSeconds(pathToFileURL(audioPath).toString())
    } catch (e) {
      console.warn(`   ⚠️  Couldn't probe duration for ${comp.id}.mp3, using 60s — ${(e instanceof Error ? e.message : String(e))}`)
    }
    // Round up + small tail so her final word doesn't clip.
    const durationInFrames = Math.ceil((audioSeconds + 0.6) * FPS)

    // selectComposition runs calculateMetadata with our inputProps so the
    // composition's duration matches the audio.
    const inputProps = { module: comp.defaultProps.module, durationInFrames }
    const resolved = await selectComposition({ serveUrl, id: comp.id, inputProps })
    console.log(`🎬 ${comp.id} — audio ${audioSeconds.toFixed(1)}s → video ${(resolved.durationInFrames / resolved.fps).toFixed(1)}s @ ${resolved.fps}fps`)

    await renderMedia({
      serveUrl,
      composition: resolved,
      codec: 'h264',
      outputLocation: outPath,
      inputProps,
      crf: 26,
      audioBitrate: '128k',
      onProgress: ({ progress }) => {
        process.stdout.write(`\r   ↳ ${Math.round(progress * 100)}%`)
      },
    })
    process.stdout.write('\n')
    const s = await stat(outPath)
    console.log(`   ✅ ${(s.size / 1024 / 1024).toFixed(1)} MB`)
  }
  console.log('\n🎉 All renders done.')
}

main().catch((e) => {
  console.error('\n💥', e)
  process.exit(1)
})
