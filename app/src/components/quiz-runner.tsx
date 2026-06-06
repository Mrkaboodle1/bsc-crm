'use client'

import { useState } from 'react'

type Q = { q: string; options: { label: string; tag: string }[] }
const QUESTIONS: Q[] = [
  { q: 'How old is your child?', options: [
    { label: '1–4 years', tag: 'toddler' }, { label: '5–8 years', tag: 'junior' }, { label: '9–12 years', tag: 'middle' }, { label: '13+ years', tag: 'teen' },
  ] },
  { q: 'What lights them up most?', options: [
    { label: 'Flips, rolls & tumbling', tag: 'acro' }, { label: 'Climbing & hanging', tag: 'aerial' }, { label: 'A bit of everything', tag: 'fusion' }, { label: 'Performing & being silly', tag: 'drama' },
  ] },
  { q: 'What are you after?', options: [
    { label: 'Fun & confidence', tag: 'fun' }, { label: 'Skill & progression', tag: 'skill' }, { label: 'Making friends', tag: 'social' }, { label: 'Working toward shows', tag: 'show' },
  ] },
]

function recommend(tags: string[]): { name: string; why: string } {
  if (tags.includes('toddler')) return { name: 'Bubby & Me Toddler', why: 'A gentle, playful intro to circus for little ones with a grown-up.' }
  if (tags.includes('aerial')) return { name: 'Aerial (Junior / Senior)', why: 'Perfect for kids who love to climb, hang and fly.' }
  if (tags.includes('acro')) return { name: 'Circus Acro', why: 'Tumbling, balancing and acrobatics to build strength and confidence.' }
  if (tags.includes('show')) return { name: 'Trainee Show Programme', why: 'For performers ready to work toward real shows.' }
  return { name: 'Circus Fusion', why: 'A bit of everything — acro, aerial, juggling and games. The best all-rounder.' }
}

export function QuizRunner({ slug }: { slug: string }) {
  const [step, setStep] = useState(0)
  const [tags, setTags] = useState<string[]>([])
  const [result, setResult] = useState<{ name: string; why: string } | null>(null)
  const [f, setF] = useState({ name: '', email: '', phone: '' })
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')

  function pick(tag: string) {
    const next = [...tags, tag]
    setTags(next)
    if (step + 1 < QUESTIONS.length) setStep(step + 1)
    else { setResult(recommend(next)); setStep(QUESTIONS.length) }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('sending')
    try {
      await fetch('/api/forms/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        formSlug: `quiz-${slug}`, name: f.name, email: f.email, phone: f.phone,
        message: `Quiz result: ${result?.name}\nAnswers: ${tags.join(', ')}`,
      }) })
    } catch { /* ignore */ }
    setState('done')
  }

  const inp = 'w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900'

  if (state === 'done') {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🎉</div>
        <h2 className="text-xl font-extrabold text-zinc-900">You&apos;re all set!</h2>
        <p className="text-zinc-600 mt-2">We&apos;ll be in touch about <strong>{result?.name}</strong> and booking a free trial.</p>
      </div>
    )
  }

  if (result) {
    return (
      <div>
        <div className="text-center mb-5">
          <div className="text-xs font-bold uppercase tracking-wide text-[#D72027]">We recommend</div>
          <h2 className="text-2xl font-extrabold text-zinc-900 mt-1">{result.name}</h2>
          <p className="text-sm text-zinc-600 mt-2">{result.why}</p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <p className="text-sm font-semibold text-zinc-700 text-center">Pop your details in for a free trial 👇</p>
          <input className={inp} placeholder="Your name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
          <input className={inp} placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <input className={inp} placeholder="Phone" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
          <button disabled={state === 'sending' || (!f.email && !f.phone) || !f.name} className="w-full bg-[#D72027] text-white font-extrabold text-sm px-5 py-3.5 rounded-xl disabled:opacity-50">{state === 'sending' ? 'Sending…' : 'Book my free trial'}</button>
        </form>
      </div>
    )
  }

  const cur = QUESTIONS[step]!
  return (
    <div>
      <div className="flex gap-1.5 mb-5">{QUESTIONS.map((_, i) => <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#D72027]' : 'bg-zinc-200'}`} />)}</div>
      <h2 className="text-lg font-extrabold text-zinc-900 mb-4">{cur.q}</h2>
      <div className="space-y-2.5">
        {cur.options.map((o) => (
          <button key={o.tag} onClick={() => pick(o.tag)} className="w-full text-left px-4 py-3.5 rounded-xl border-2 border-zinc-200 hover:border-[#D72027] hover:bg-red-50 font-semibold text-sm text-zinc-800">{o.label}</button>
        ))}
      </div>
    </div>
  )
}
