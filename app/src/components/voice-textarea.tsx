'use client'

import { useRef, useState, useEffect } from 'react'
import { Mic, Sparkles } from 'lucide-react'

type RecognitionLike = {
  lang: string; continuous: boolean; interimResults: boolean
  start: () => void; stop: () => void; abort?: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onend: (() => void) | null; onerror: (() => void) | null
}

// A textarea you can dictate into (mic) and tidy up (AI fixes spelling/grammar).
export function VoiceTextarea({ value, onChange, placeholder, rows = 3 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number
}) {
  const [listening, setListening] = useState(false)
  const [tidying, setTidying] = useState(false)
  const recRef = useRef<RecognitionLike | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const supported = typeof window !== 'undefined' && !!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition)

  // Always release the mic if the component goes away.
  function cleanup() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    const r = recRef.current; recRef.current = null
    try { r?.abort?.(); r?.stop() } catch { /* ignore */ }
    setListening(false)
  }
  useEffect(() => cleanup, [])

  function startMic() {
    const w = window as unknown as { SpeechRecognition?: new () => RecognitionLike; webkitSpeechRecognition?: new () => RecognitionLike }
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!Ctor) return
    let rec: RecognitionLike
    try { rec = new Ctor() } catch { setListening(false); return }
    recRef.current = rec
    rec.lang = 'en-AU'; rec.continuous = true; rec.interimResults = false
    rec.onresult = (e) => {
      let add = ''
      for (let i = 0; i < e.results.length; i++) { const r = e.results[i]; if (r && r[0]) add += r[0].transcript + ' ' }
      if (add.trim()) onChange((value ? value + ' ' : '') + add.trim())
    }
    rec.onend = () => { recRef.current = null; if (timerRef.current) clearTimeout(timerRef.current); setListening(false) }
    rec.onerror = () => { recRef.current = null; if (timerRef.current) clearTimeout(timerRef.current); setListening(false) }
    try {
      rec.start(); setListening(true)
      // Hard safety stop after 40s so the mic can never get stuck on.
      timerRef.current = setTimeout(cleanup, 40000)
    } catch { cleanup() }
  }

  function toggleMic() { if (listening) cleanup(); else startMic() }

  async function tidy() {
    if (!value.trim()) return
    setTidying(true)
    try {
      const r = await fetch('/api/ai-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ task: 'free', prompt: `Fix the spelling and grammar of this coaching lesson note. Keep it short, plain and in the coach's own words — do not add new information. Output only the corrected text:\n\n${value}` }) })
      const j = await r.json()
      if (j.text) onChange(j.text)
      else if (j.error) alert(j.error)
    } catch { alert('Could not tidy up — try again.') } finally { setTidying(false) }
  }

  return (
    <div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027] leading-relaxed" />
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {supported && (
          <button type="button" onClick={toggleMic} className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg ${listening ? 'bg-[#D72027] text-white animate-pulse' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
            <Mic size={13} /> {listening ? 'Listening… tap to stop' : 'Talk to type'}
          </button>
        )}
        <button type="button" onClick={tidy} disabled={tidying || !value.trim()} className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50">
          <Sparkles size={13} /> {tidying ? 'Tidying…' : 'Tidy up spelling & grammar'}
        </button>
        {!supported && <span className="text-[11px] text-zinc-400">Tip: on iPad, tap the textbox then the 🎤 on the keyboard to dictate.</span>}
      </div>
    </div>
  )
}
