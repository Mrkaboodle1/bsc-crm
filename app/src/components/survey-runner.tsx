'use client'

import { useState } from 'react'

export function SurveyRunner({ slug }: { slug: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [name, setName] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!rating) return
    setState('sending')
    try {
      await fetch('/api/forms/submit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
        formSlug: `survey-${slug}`, noContact: true, name,
        message: `⭐ Rating: ${rating}/5${comment ? `\nComment: ${comment}` : ''}`,
      }) })
    } catch { /* ignore */ }
    setState('done')
  }

  if (state === 'done') {
    return <div className="text-center py-8"><div className="text-5xl mb-3">🙏</div><h2 className="text-xl font-extrabold text-zinc-900">Thank you!</h2><p className="text-zinc-600 mt-2">Your feedback helps us make Big Star even better.</p></div>
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-700 mb-3">How would you rate your experience?</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} onMouseEnter={() => setHover(n)} onMouseLeave={() => setHover(0)} onClick={() => setRating(n)} className="text-3xl">
              <span className={(hover || rating) >= n ? 'opacity-100' : 'opacity-25'}>⭐</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Anything you&apos;d like to tell us?</label>
        <textarea className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What you loved, or what we could do better…" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-zinc-600 mb-1.5">Your name (optional)</label>
        <input className="w-full px-4 py-3 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-900" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <button disabled={!rating || state === 'sending'} className="w-full bg-[#D72027] text-white font-extrabold text-sm px-5 py-3.5 rounded-xl disabled:opacity-50">{state === 'sending' ? 'Sending…' : 'Submit feedback'}</button>
    </form>
  )
}
