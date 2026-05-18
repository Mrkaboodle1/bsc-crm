// Pre-render the 11 training-module narrations as MP3 using Microsoft Edge's
// Read Aloud API (free, no key, en-AU-NatashaNeural — premium Australian
// female neural voice). Output: app/public/training/audio/<id>.mp3
//
// Run once, then check the MP3s into git. The training portal plays the
// MP3 instead of using the browser's flaky SpeechSynthesis API.

import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'
import { mkdir, readFile, rename, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const REPO_ROOT  = path.resolve(__dirname, '..', '..')
const MODULES_TS = path.join(REPO_ROOT, 'app', 'src', 'app', 'training', 'modules.ts')
const OUT_DIR    = path.join(REPO_ROOT, 'app', 'public', 'training', 'audio')

// Parse modules.ts as text — we only need id + script. Importing the TS
// file from Node would need a compile step, so a regex parse is simpler.
async function loadModuleScripts() {
  const src = await readFile(MODULES_TS, 'utf8')
  // Match: id: 'foo', ... script: `...`, ... (DOTALL across many lines)
  const re = /\{\s*id:\s*'([^']+)'[\s\S]*?script:\s*`([\s\S]*?)`,/g
  const out = []
  let m
  while ((m = re.exec(src)) != null) {
    out.push({ id: m[1], script: m[2].trim() })
  }
  return out
}

async function main() {
  const modules = await loadModuleScripts()
  if (modules.length === 0) throw new Error('No modules parsed from modules.ts')
  console.log(`Found ${modules.length} modules to render`)
  await mkdir(OUT_DIR, { recursive: true })

  // Force=true if first CLI arg is --force; otherwise skip already-rendered.
  const force = process.argv.includes('--force')

  for (const mod of modules) {
    const outPath = path.join(OUT_DIR, `${mod.id}.mp3`)
    if (!force) {
      try {
        const s = await stat(outPath)
        if (s.size > 0) {
          console.log(`⏭  ${mod.id} — already exists (${s.size} bytes), skipping`)
          continue
        }
      } catch {}
    }

    console.log(`🎙  ${mod.id} — ${mod.script.length} chars …`)
    const tts = new MsEdgeTTS()
    await tts.setMetadata('en-AU-NatashaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3)

    // toFile writes <hash>.mp3 into a directory — we then rename it to <id>.mp3
    const tmpDir = path.join(OUT_DIR, `_tmp_${mod.id}`)
    await mkdir(tmpDir, { recursive: true })
    try {
      // Microsoft's neural voices ship a natural pace — leave prosody at
      // defaults. Tinkering with rate/pitch routinely breaks the WS stream.
      const { audioFilePath } = await tts.toFile(tmpDir, mod.script)
      await rename(audioFilePath, outPath)
      const size = (await stat(outPath)).size
      console.log(`   ↳ ${outPath} (${(size / 1024).toFixed(1)} KB)`)
    } finally {
      tts.close()
      await rm(tmpDir, { recursive: true, force: true })
    }
  }
  console.log('\n✅ All modules rendered.')
}

main().catch((e) => {
  console.error('💥', e)
  process.exit(1)
})
