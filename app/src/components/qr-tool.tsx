'use client'

import { useState } from 'react'
import { Download, QrCode, Link as LinkIcon } from 'lucide-react'

export function QrTool({ presets = [], defaultUrl = '', filePrefix = 'qr' }: { presets?: { label: string; url: string }[]; defaultUrl?: string; filePrefix?: string }) {
  const PRESETS = presets
  const [text, setText] = useState(defaultUrl)
  const [size, setSize] = useState(400)
  const [colour, setColour] = useState('000000')
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text || ' ')}&color=${colour}&margin=10`

  async function download() {
    try {
      const res = await fetch(src)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${filePrefix}-qr-${(text || 'code').replace(/[^a-z0-9]+/gi, '-').slice(0, 30)}.png`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(a.href)
    } catch { /* ignore */ }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6 max-w-4xl">
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-5">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Where should the QR code point?</label>
          <div className="relative">
            <LinkIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="https://… or any text" className="w-full pl-9 pr-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => setText(p.url)} className="text-[11px] font-semibold px-2 py-1 rounded border border-zinc-200 text-zinc-600 hover:border-zinc-900 hover:text-zinc-900">{p.label}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Size</label>
            <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none bg-white">
              <option value={300}>Small (300px)</option>
              <option value={400}>Medium (400px)</option>
              <option value={800}>Large (800px)</option>
              <option value={1200}>Print / poster (1200px)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Colour</label>
            <div className="flex gap-1.5">
              {[['000000', 'Black'], ['D72027', 'Brand red'], ['1d4ed8', 'Blue']].map(([hex, name]) => (
                <button key={hex} onClick={() => setColour(hex)} title={name} className={`w-8 h-8 rounded-md border-2 ${colour === hex ? 'border-zinc-900' : 'border-zinc-200'}`} style={{ background: `#${hex}` }} />
              ))}
            </div>
          </div>
        </div>
        <p className="text-[11px] text-zinc-400">Tip: print these on flyers, posters and show banners. Point them at your free-trial form to turn scans into leads.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6 flex flex-col items-center justify-center text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-3 self-start flex items-center gap-1.5"><QrCode size={13} /> Live preview</div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="QR code" className="w-56 h-56 rounded-lg border border-zinc-100" />
        <button onClick={download} className="mt-4 inline-flex items-center gap-2 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-5 py-2.5 rounded-lg w-full justify-center">
          <Download size={16} /> Download PNG
        </button>
      </div>
    </div>
  )
}
