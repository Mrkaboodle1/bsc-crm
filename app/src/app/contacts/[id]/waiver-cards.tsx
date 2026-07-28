'use client'
import { useState } from 'react'

export type Waiver = {
  id: string
  event_type: string | null
  children: string | null
  medical: string | null
  emergency: string | null
  created_at: string
  answers: Record<string, unknown> | null
}

const label = (t: string | null) => t === 'kno' ? 'Kids Night Out' : t === 'shw' ? 'School Holiday Workshop' : t === 'free_trial' ? 'Free Trial' : 'Form'
const fmt = (d: string) => new Date(d).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
const isLcDoc = (v: unknown) => typeof v === 'string' && /^https:\/\/services\.leadconnectorhq\.com\/documents\/download\//.test(v)
const proxy = (u: string) => `/api/waiver-signature?url=${encodeURIComponent(u)}`
// find the signature image URL among the raw form fields
const findSignature = (a: Record<string, unknown> | null): string | null => {
  const fields = ((a ?? {}) as Record<string, unknown>).fields as Record<string, unknown> | undefined
  if (!fields) return null
  for (const [k, v] of Object.entries(fields)) if (/sign|autograph/i.test(k) && isLcDoc(v)) return v as string
  return null
}

export function WaiverCards({ waivers }: { waivers: Waiver[] }) {
  const [open, setOpen] = useState<Waiver | null>(null)
  if (!waivers.length) return null

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-3">📋 Forms &amp; Waivers ({waivers.length})</div>
      <ul className="space-y-2">
        {waivers.map((w) => {
          const a = (w.answers ?? {}) as Record<string, string>
          return (
            <li key={w.id}>
              <button
                onClick={() => setOpen(w)}
                className="w-full text-left text-xs border-l-2 border-[#D72027] pl-2.5 py-1.5 rounded-r-lg hover:bg-zinc-50 transition-colors group"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-extrabold text-zinc-800 group-hover:text-[#D72027]">{label(w.event_type)} <span className="text-zinc-400 font-normal">→ view</span></span>
                  <span className="text-[10px] text-zinc-400">{fmt(w.created_at)}</span>
                </div>
                {w.children && <div className="text-zinc-600 mt-0.5 truncate"><b>Children:</b> {w.children}</div>}
                {a.class_attending && <div className="text-zinc-500 mt-0.5 truncate">{a.class_attending}</div>}
              </button>
            </li>
          )
        })}
      </ul>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl shadow-xl border border-zinc-200 max-w-lg w-full max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-zinc-200 px-5 py-3.5 flex items-center justify-between">
              <div>
                <div className="font-extrabold text-zinc-900">{label(open.event_type)}</div>
                <div className="text-xs text-zinc-500">Submitted {fmt(open.created_at)}</div>
              </div>
              <button onClick={() => setOpen(null)} className="text-zinc-400 hover:text-zinc-700 text-xl font-bold leading-none px-2">×</button>
            </div>
            <div className="p-5 space-y-2.5 text-sm">
              <Row label="Children" value={open.children} />
              <Row label="Medical / Allergies" value={open.medical} danger />
              <Row label="Class" value={(open.answers as Record<string, string>)?.class_attending} />
              <Row label="Heard via" value={(open.answers as Record<string, string>)?.how_heard} />
              <Row label="Source" value={(open.answers as Record<string, string>)?.source} />
              <Row label="Emergency contact" value={open.emergency} />
              <Row label="Address" value={(open.answers as Record<string, string>)?.address} />

              {/* Signature — the actual signed image, proxied from Tectonic */}
              {(() => {
                const sig = findSignature(open.answers)
                if (!sig) return null
                return (
                  <div className="pt-2 mt-2 border-t border-zinc-100">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">✍️ Signature</div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={proxy(sig)} alt="Signature" className="border border-zinc-200 rounded-lg bg-white max-h-36 p-2" />
                  </div>
                )
              })()}

              {/* Every raw field captured on the form */}
              {(() => {
                const fields = ((open.answers ?? {}) as Record<string, unknown>).fields as Record<string, string> | undefined
                if (!fields || !Object.keys(fields).length) return null
                return (
                  <div className="pt-2 mt-2 border-t border-zinc-100">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400 mb-1.5">Full form</div>
                    <div className="space-y-1.5">
                      {Object.entries(fields).map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[40%_60%] gap-2">
                          <div className="text-zinc-500 text-xs">{k}</div>
                          <div className="text-zinc-800 text-xs break-words">{isLcDoc(v) ? <a href={proxy(v as string)} target="_blank" className="text-[#635BFF] underline">view / download</a> : typeof v === 'string' && v.startsWith('http') ? <a href={v} target="_blank" className="text-[#635BFF] underline">open link</a> : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, danger }: { label: string; value: string | null | undefined; danger?: boolean }) {
  if (!value) return null
  return (
    <div className="grid grid-cols-[35%_65%] gap-2">
      <div className="text-zinc-500 font-semibold text-xs">{label}</div>
      <div className={`text-xs ${danger ? 'text-red-700 font-semibold' : 'text-zinc-800'}`}>{value}</div>
    </div>
  )
}
