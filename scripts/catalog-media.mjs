#!/usr/bin/env node
// catalog-media.mjs
// Walks one or more media roots, fingerprints every image/video, and writes a
// JSON catalog the CRM can read. Idempotent — re-runs only hash NEW files.
//
// Usage:
//   node scripts/catalog-media.mjs [root1] [root2] [...]
//
// Default roots (Windows-friendly):
//   D:\BSC
//   C:\Users\Rhett Morrow\Pictures
//
// Output: media-catalog.json (in the bsc-crm root)

import { promises as fs } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.heif', '.webp', '.gif', '.bmp', '.tiff', '.tif'])
const VIDEO_EXT = new Set(['.mp4', '.mov', '.m4v', '.avi', '.mkv', '.webm'])
const SKIP_DIRS = new Set(['node_modules', '.git', '.next', '.vercel', '$RECYCLE.BIN', 'System Volume Information'])

const argv = process.argv.slice(2)
const ROOTS = argv.length > 0 ? argv : [
  'D:\\BSC',
  'C:\\Users\\Rhett Morrow\\Pictures',
]

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUTFILE = path.join(PROJECT_ROOT, 'media-catalog.json')

console.log(`📁 Project root: ${PROJECT_ROOT}`)
console.log(`📝 Output: ${OUTFILE}`)
console.log(`🔎 Scanning: ${ROOTS.join('\n            ')}`)
console.log('')

// Load existing catalog (so re-runs are cheap)
let catalog = { generated_at: null, version: 1, items: {} }
try {
  const txt = await fs.readFile(OUTFILE, 'utf8')
  catalog = JSON.parse(txt)
  console.log(`📚 Loaded existing catalog with ${Object.keys(catalog.items).length} items`)
} catch {
  console.log('📚 No existing catalog — starting fresh')
}

let scanned = 0
let added = 0
let skipped = 0
let errored = 0

async function walk(dir) {
  let entries
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (e) {
    console.warn(`  ⚠ Cannot read ${dir}: ${e.code}`)
    return
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walk(full)
      continue
    }
    if (!entry.isFile()) continue
    const ext = path.extname(entry.name).toLowerCase()
    const isImage = IMAGE_EXT.has(ext)
    const isVideo = VIDEO_EXT.has(ext)
    if (!isImage && !isVideo) continue
    scanned++

    // Idempotency — keyed by absolute path. If file already cataloged and
    // mtime/size haven't changed, skip rehash.
    const stat = await fs.stat(full).catch(() => null)
    if (!stat) { errored++; continue }
    const existing = catalog.items[full]
    if (existing && existing.size === stat.size && existing.mtime === stat.mtimeMs) {
      skipped++
      continue
    }

    // Hash content (chunked, no full-file load — works for big videos)
    try {
      const hash = createHash('sha256')
      const fh = await fs.open(full, 'r')
      try {
        const buf = Buffer.alloc(1 << 20) // 1 MB
        let bytesRead = 0
        while (true) {
          const { bytesRead: n } = await fh.read(buf, 0, buf.length, null)
          if (n === 0) break
          hash.update(buf.subarray(0, n))
          bytesRead += n
        }
      } finally {
        await fh.close()
      }
      const digest = hash.digest('hex')

      catalog.items[full] = {
        path: full,
        rel: path.relative(PROJECT_ROOT, full),
        kind: isImage ? 'image' : 'video',
        ext: ext.replace('.', ''),
        size: stat.size,
        mtime: stat.mtimeMs,
        mtime_iso: new Date(stat.mtimeMs).toISOString(),
        sha256: digest,
        tags: existing?.tags ?? [],
        description: existing?.description ?? null,
        consent: existing?.consent ?? 'unreviewed',
        last_posted_at: existing?.last_posted_at ?? null,
        post_count: existing?.post_count ?? 0,
      }
      added++
      if (added % 25 === 0) {
        process.stdout.write(`\r  📸 Cataloged ${added}…`)
      }
    } catch (e) {
      errored++
      console.warn(`  ⚠ Failed to hash ${full}: ${e.message}`)
    }
  }
}

for (const root of ROOTS) {
  console.log(`\n🔍 Walking ${root}`)
  await walk(root)
}

catalog.generated_at = new Date().toISOString()

// Pretty stats
const items = Object.values(catalog.items)
const images = items.filter((i) => i.kind === 'image').length
const videos = items.filter((i) => i.kind === 'video').length
const heic = items.filter((i) => i.ext === 'heic' || i.ext === 'heif').length
const totalBytes = items.reduce((sum, i) => sum + i.size, 0)
const totalGB = (totalBytes / (1024 ** 3)).toFixed(2)

// Find duplicate hashes (same content, multiple paths)
const byHash = new Map()
for (const item of items) {
  if (!byHash.has(item.sha256)) byHash.set(item.sha256, [])
  byHash.get(item.sha256).push(item.path)
}
const dupGroups = [...byHash.values()].filter((paths) => paths.length > 1)
const dupCount = dupGroups.reduce((sum, paths) => sum + paths.length - 1, 0)

console.log(`\n\n📊 Catalog complete`)
console.log(`   Total items:    ${items.length}`)
console.log(`     ├ images:     ${images} (${heic} HEIC, ${images - heic} other)`)
console.log(`     └ videos:     ${videos}`)
console.log(`   Total size:     ${totalGB} GB`)
console.log(`   Scanned:        ${scanned}`)
console.log(`   New/updated:    ${added}`)
console.log(`   Unchanged:      ${skipped}`)
console.log(`   Errors:         ${errored}`)
console.log(`   Duplicate sets: ${dupGroups.length} (${dupCount} extra copies)`)

await fs.writeFile(OUTFILE, JSON.stringify(catalog, null, 2), 'utf8')
console.log(`\n✅ Wrote ${OUTFILE} (${((await fs.stat(OUTFILE)).size / 1024).toFixed(0)} KB)`)
