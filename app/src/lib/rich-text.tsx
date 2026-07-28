import React from 'react'

// Renders a tiny, SAFE subset of formatting into React nodes — no raw HTML,
// so there is no injection risk. Supported markers (what the Form Builder
// toolbar inserts):
//   **bold**      → bold
//   __underline__ → underline
//   *italic*      → italic
//   line breaks   → real line breaks
function parseInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*)/g
  let last = 0
  let i = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2] != null) nodes.push(<strong key={`${keyPrefix}-${i}`}>{m[2]}</strong>)
    else if (m[3] != null) nodes.push(<u key={`${keyPrefix}-${i}`}>{m[3]}</u>)
    else if (m[4] != null) nodes.push(<em key={`${keyPrefix}-${i}`}>{m[4]}</em>)
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

export function RichText({ text, className }: { text: string; className?: string }) {
  const lines = (text ?? '').split('\n')
  return (
    <span className={className}>
      {lines.map((ln, i) => (
        <React.Fragment key={i}>
          {i > 0 && <br />}
          {parseInline(ln, `l${i}`)}
        </React.Fragment>
      ))}
    </span>
  )
}
