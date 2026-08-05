'use client'
import { useEffect, useRef, useState } from 'react'

// Draw-your-signature box for public forms — finger on a phone, mouse on a
// desktop. Exports a PNG data-URL that gets stored on the signed_waivers row,
// so every trial, workshop and Kids Night Out booking carries a real signature.
export function SignaturePad({ value, onChange, label = 'Signature of parent / legal guardian' }: {
  value: string
  onChange: (dataUrl: string) => void
  label?: string
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(!value)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    // Crisp on retina/phone screens.
    const ratio = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = rect.width * ratio
    c.height = rect.height * ratio
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#14213d'
  }, [])

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const ctx = ref.current?.getContext('2d'); if (!ctx) return
    const p = pos(e)
    drawing.current = true
    ctx.beginPath(); ctx.moveTo(p.x, p.y)
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = ref.current?.getContext('2d'); if (!ctx) return
    const p = pos(e)
    ctx.lineTo(p.x, p.y); ctx.stroke()
  }
  function up() {
    if (!drawing.current) return
    drawing.current = false
    const c = ref.current; if (!c) return
    setEmpty(false)
    onChange(c.toDataURL('image/png'))
  }
  function clear() {
    const c = ref.current; const ctx = c?.getContext('2d')
    if (!c || !ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
    setEmpty(true); onChange('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-bold uppercase tracking-wide text-zinc-500">{label} *</label>
        {!empty && <button type="button" onClick={clear} className="text-xs font-bold text-[#D72027] hover:underline">Clear</button>}
      </div>
      <canvas
        ref={ref}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="w-full h-36 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50 touch-none cursor-crosshair"
      />
      {empty && <p className="text-[11px] text-zinc-400 mt-1">Sign above with your finger or mouse.</p>}
    </div>
  )
}
