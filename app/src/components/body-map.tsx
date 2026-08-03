'use client'
// Tap-the-body picture for incident reports — front and back silhouettes.
// Selections are stored INSIDE injury_details as a first line "📍 Body: Neck, Left arm"
// so no schema change is needed and the info survives print/email as plain text.

type Region = { label: string; el: 'c' | 'r' | 'e'; a: number[] }

// Front view: the child faces you, so the child's RIGHT side is on YOUR left.
const FRONT: Region[] = [
  { label: 'Head', el: 'c', a: [60, 20, 15] },
  { label: 'Neck', el: 'r', a: [52, 34, 16, 9, 3] },
  { label: 'Right shoulder', el: 'c', a: [37, 50, 8] },
  { label: 'Left shoulder', el: 'c', a: [83, 50, 8] },
  { label: 'Chest', el: 'r', a: [43, 43, 34, 29, 8] },
  { label: 'Stomach', el: 'r', a: [43, 72, 34, 26, 8] },
  { label: 'Right arm', el: 'r', a: [25, 56, 12, 46, 6] },
  { label: 'Left arm', el: 'r', a: [83, 56, 12, 46, 6] },
  { label: 'Right hand', el: 'c', a: [31, 110, 7] },
  { label: 'Left hand', el: 'c', a: [89, 110, 7] },
  { label: 'Hips', el: 'r', a: [43, 98, 34, 16, 6] },
  { label: 'Right leg', el: 'r', a: [44, 114, 15, 44, 7] },
  { label: 'Left leg', el: 'r', a: [61, 114, 15, 44, 7] },
  { label: 'Right knee', el: 'c', a: [51.5, 162, 7] },
  { label: 'Left knee', el: 'c', a: [68.5, 162, 7] },
  { label: 'Right shin', el: 'r', a: [45.5, 169, 12, 33, 5] },
  { label: 'Left shin', el: 'r', a: [62.5, 169, 12, 33, 5] },
  { label: 'Right foot', el: 'e', a: [50, 208, 10, 5.5] },
  { label: 'Left foot', el: 'e', a: [70, 208, 10, 5.5] },
]

// Back view: the child faces away, so the child's LEFT side is on YOUR left.
const BACK: Region[] = [
  { label: 'Back of head', el: 'c', a: [60, 20, 15] },
  { label: 'Neck', el: 'r', a: [52, 34, 16, 9, 3] },
  { label: 'Left shoulder', el: 'c', a: [37, 50, 8] },
  { label: 'Right shoulder', el: 'c', a: [83, 50, 8] },
  { label: 'Upper back', el: 'r', a: [43, 43, 34, 29, 8] },
  { label: 'Lower back', el: 'r', a: [43, 72, 34, 26, 8] },
  { label: 'Left arm', el: 'r', a: [25, 56, 12, 46, 6] },
  { label: 'Right arm', el: 'r', a: [83, 56, 12, 46, 6] },
  { label: 'Left hand', el: 'c', a: [31, 110, 7] },
  { label: 'Right hand', el: 'c', a: [89, 110, 7] },
  { label: 'Bottom', el: 'r', a: [43, 98, 34, 16, 6] },
  { label: 'Left leg', el: 'r', a: [44, 114, 15, 44, 7] },
  { label: 'Right leg', el: 'r', a: [61, 114, 15, 44, 7] },
  { label: 'Left knee', el: 'c', a: [51.5, 162, 7] },
  { label: 'Right knee', el: 'c', a: [68.5, 162, 7] },
  { label: 'Left shin', el: 'r', a: [45.5, 169, 12, 33, 5] },
  { label: 'Right shin', el: 'r', a: [62.5, 169, 12, 33, 5] },
  { label: 'Left foot', el: 'e', a: [50, 208, 10, 5.5] },
  { label: 'Right foot', el: 'e', a: [70, 208, 10, 5.5] },
]

// ── injury_details marker line helpers ───────────────────────────────────
export function extractBody(text?: string | null): { parts: string[]; rest: string } {
  const t = text || ''
  const m = t.match(/^📍 *Body: *(.+)$/m)
  if (!m) return { parts: [], rest: t }
  const parts = m[1].split(',').map((s) => s.trim()).filter(Boolean)
  const rest = t.replace(m[0], '').replace(/^\n+/, '').trim()
  return { parts, rest }
}

export function withBody(parts: string[], rest: string): string {
  const r = (rest || '').trim()
  if (!parts.length) return r
  return `📍 Body: ${parts.join(', ')}` + (r ? `\n${r}` : '')
}

// ── the tappable person ──────────────────────────────────────────────────
function Silhouette({ regions, title, value, toggle, readOnly }: {
  regions: Region[]; title: string; value: string[]; toggle?: (label: string) => void; readOnly?: boolean
}) {
  return (
    <div className="text-center">
      <svg viewBox="0 0 120 230" className="w-[110px] sm:w-[130px] mx-auto select-none">
        {regions.map((rg) => {
          const on = value.includes(rg.label)
          const common = {
            fill: on ? '#dc2626' : '#e4e4e7',
            stroke: on ? '#991b1b' : '#a1a1aa',
            strokeWidth: 1,
            style: { cursor: readOnly ? 'default' : 'pointer', transition: 'fill .12s' } as React.CSSProperties,
            onClick: readOnly || !toggle ? undefined : () => toggle(rg.label),
          }
          return (
            <g key={rg.label}>
              {rg.el === 'c' && <circle cx={rg.a[0]} cy={rg.a[1]} r={rg.a[2]} {...common}><title>{rg.label}</title></circle>}
              {rg.el === 'r' && <rect x={rg.a[0]} y={rg.a[1]} width={rg.a[2]} height={rg.a[3]} rx={rg.a[4] ?? 0} {...common}><title>{rg.label}</title></rect>}
              {rg.el === 'e' && <ellipse cx={rg.a[0]} cy={rg.a[1]} rx={rg.a[2]} ry={rg.a[3]} {...common}><title>{rg.label}</title></ellipse>}
            </g>
          )
        })}
      </svg>
      <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-400 mt-1">{title}</div>
    </div>
  )
}

export function BodyMap({ value, onChange, readOnly }: { value: string[]; onChange?: (v: string[]) => void; readOnly?: boolean }) {
  const toggle = (label: string) => {
    if (!onChange) return
    onChange(value.includes(label) ? value.filter((v) => v !== label) : [...value, label])
  }
  return (
    <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3">
      {!readOnly && <p className="text-xs text-zinc-500 text-center mb-1">Tap the body where it happened — you can pick more than one spot (left/right are the <b>child’s</b> left and right).</p>}
      <div className="flex justify-center gap-6">
        <Silhouette regions={FRONT} title="Front" value={value} toggle={toggle} readOnly={readOnly} />
        <Silhouette regions={BACK} title="Back" value={value} toggle={toggle} readOnly={readOnly} />
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 justify-center mt-2">
          {value.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 text-[11px] font-bold bg-red-50 text-red-700 border border-red-200 rounded-full px-2 py-0.5">
              📍 {p}
              {!readOnly && <button type="button" onClick={() => toggle(p)} className="text-red-400 hover:text-red-700 font-extrabold">×</button>}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
