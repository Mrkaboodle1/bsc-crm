// Convert every published HTML compliance document into a .docx Word file.
// Writes outputs alongside the HTMLs in `Child Safe Standards/Published/`
// AND into `app/public/compliance/` so the CRM can serve them as downloads.
//
// Run: node generate-compliance-docx.mjs

import { readFileSync, writeFileSync, readdirSync, copyFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import HTMLtoDOCX from 'html-to-docx'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT       = path.resolve(__dirname, '..')
const PUBLISHED  = path.join(ROOT, 'Child Safe Standards', 'Published')
const PUBLIC_DIR = path.join(ROOT, 'app', 'public', 'compliance')

const HEADER = `
  <p style="text-align:center;font-family:Arial;font-size:9pt;color:#71717a">
    BigStar Circus &middot; 14 Harper Street, Molendinar QLD 4214 &middot;
    admin@bigstarcircus.com.au &middot; 0439 188 179
  </p>
`
const FOOTER = `
  <p style="text-align:center;font-family:Arial;font-size:9pt;color:#71717a">
    BigStar Circus | Creating Superstars Through Circus Arts
  </p>
`

const options = {
  font: 'Arial',
  pageSize: { width: 12240, height: 15840 }, // US Letter in TWIPs
  margins: { top: 1440, right: 1440, bottom: 1440, left: 1440, header: 720, footer: 720 },
  table: { row: { cantSplit: true } },
  orientation: 'portrait',
  title: 'BigStar Circus Compliance Document',
  creator: 'BigStar Circus',
  header: true,
  footer: true,
  pageNumber: true,
}

// Strip the on-screen "PRINT TO PDF" hint and the screen-only watermark
// from the HTML before conversion so they don't pollute the Word doc.
function cleanHtml(html) {
  return html
    .replace(/<div class="screen-print-hint"[\s\S]*?<\/div>/g, '')
    .replace(/<link[^>]*_bsc-style\.css[^>]*>/g, '')
    // Word's docx renderer doesn't honour external @import — strip the
    // Google Fonts import too.
    .replace(/@import\s+url\([^)]*\);?/g, '')
    // html-to-docx's XML parser chokes on bare `@` in plain text (it tries
    // to parse it as a namespace attribute). Escape every `@` to its HTML
    // entity.
    .replace(/@/g, '&#64;')
    // html-to-docx also chokes on percent-width inline styles on table
    // cells (`<th style="width:8%">`). Strip them — the library will fall
    // back to even-distribution which is fine for Word.
    .replace(/style="[^"]*width:\s*\d+%[^"]*"/g, '')
    .replace(/style='[^']*width:\s*\d+%[^']*'/g, '')
}

async function main() {
  const files = readdirSync(PUBLISHED).filter((f) => /^\d+_.*\.html$/.test(f)).sort()
  if (files.length === 0) {
    console.error('No HTML compliance documents found in', PUBLISHED)
    process.exit(1)
  }
  console.log(`Found ${files.length} HTML documents to convert.`)

  for (const file of files) {
    const htmlPath = path.join(PUBLISHED, file)
    const docxName = file.replace(/\.html$/, '.docx')
    const docxPath = path.join(PUBLISHED, docxName)
    const publicPath = path.join(PUBLIC_DIR, docxName)

    const html = cleanHtml(readFileSync(htmlPath, 'utf8'))
    try {
      const buffer = await HTMLtoDOCX(html, HEADER, options, FOOTER)
      writeFileSync(docxPath, buffer)
      copyFileSync(docxPath, publicPath)
      const kb = (buffer.length / 1024).toFixed(1)
      console.log(`  ✓ ${docxName.padEnd(50)} ${kb} KB`)
    } catch (e) {
      console.error(`  ✗ ${docxName}:`, e.message)
    }
  }
  console.log('\nDone. Word versions saved alongside HTMLs + in app/public/compliance/.')
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1) })
