import 'server-only'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// Standard PDF fonts only handle Latin text — strip emoji / fancy punctuation.
const safe = (s: string) => (s || '').replace(/[•]/g, '-').replace(/[–—]/g, '-').replace(/[^\x20-\x7E]/g, '').trimEnd()

// Build a simple one-or-more page roster PDF; returns base64 (for email attach).
export async function rosterPdfBase64(title: string, subtitle: string, lines: string[]): Promise<string> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const red = rgb(0.843, 0.125, 0.153)
  let page = doc.addPage([595, 842])
  let y = 800
  const draw = (text: string, size: number, f = font, color = rgb(0.1, 0.1, 0.1)) => {
    if (y < 50) { page = doc.addPage([595, 842]); y = 800 }
    page.drawText(safe(text) || ' ', { x: 42, y, size, font: f, color })
    y -= size + 6
  }
  draw('Big Star Circus', 20, bold, red)
  draw(title, 14, bold)
  if (subtitle) draw(subtitle, 10, font, rgb(0.45, 0.45, 0.45))
  y -= 8
  for (const ln of lines) {
    const t = ln.trim()
    const isHeader = !!t && t === t.toUpperCase() && !t.startsWith('•') && !t.startsWith('-')
    draw(ln, isHeader ? 12 : 10, isHeader ? bold : font)
  }
  const bytes = await doc.save()
  return Buffer.from(bytes).toString('base64')
}
