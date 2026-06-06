'use client'

import { useState } from 'react'
import { Sparkles, Copy, Check } from 'lucide-react'

const IDEAS = [
  '5 benefits of circus for kids',
  'What to expect at your first class',
  'Why aerial builds confidence',
  'Getting ready for our end-of-year show',
  'School holiday workshops — a parent’s guide',
]

export function BlogWriter() {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState('friendly')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [copied, setCopied] = useState(false)

  async function write() {
    if (!topic.trim()) return
    setBusy(true); setErr(''); setText('')
    try {
      const r = await fetch('/api/ai-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: 'free', tone, maxWords: 450, prompt: `Write a friendly blog article for the Big Star Circus website titled around "${topic}". Around 400 words. Start with a short hook, use 2–3 short sections with simple subheadings, and finish with a warm call to action to book a free trial.` }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not write')
      setText(j.text)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not write') } finally { setBusy(false) }
  }

  async function copy() { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ } }

  const inp = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-zinc-900'
  return (
    <div className="grid lg:grid-cols-[340px_1fr] gap-6">
      <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-4 self-start">
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1.5">What&apos;s the post about?</label>
          <input className={inp} value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Why circus builds confidence" />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {IDEAS.map((i) => <button key={i} onClick={() => setTopic(i)} className="text-[11px] font-medium px-2 py-1 rounded border border-zinc-200 text-zinc-600 hover:border-zinc-900">{i}</button>)}
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Tone</label>
          <select className={inp} value={tone} onChange={(e) => setTone(e.target.value)}>
            <option value="friendly">Friendly</option><option value="playful">Playful</option><option value="professional">Professional</option>
          </select>
        </div>
        <button onClick={write} disabled={busy || !topic.trim()} className="w-full inline-flex items-center justify-center gap-2 bg-[#D72027] text-white font-semibold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#A0151B]">
          <Sparkles size={16} /> {busy ? 'Writing…' : 'Write with AI'}
        </button>
        {err && <p className="text-xs text-red-600">{err}</p>}
        <p className="text-[11px] text-zinc-400">Jacky drafts it; you tweak and paste it onto your website or share to social. Saving posts in-app can come next.</p>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-zinc-900">Your draft</h3>
          {text && <button onClick={copy} className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-600 border border-zinc-200 rounded-md px-2.5 py-1.5 hover:bg-zinc-50">{copied ? <><Check size={13} className="text-emerald-600" /> Copied</> : <><Copy size={13} /> Copy</>}</button>}
        </div>
        {text ? (
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={20} className="w-full text-sm text-zinc-800 leading-relaxed border-0 focus:outline-none resize-none" />
        ) : (
          <div className="text-center text-sm text-zinc-400 py-20">Your AI-written blog post will appear here. Pick a topic and hit <strong>Write with AI</strong>.</div>
        )}
      </div>
    </div>
  )
}
