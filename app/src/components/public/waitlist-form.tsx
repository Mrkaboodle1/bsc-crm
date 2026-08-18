'use client'

// The satellite waitlist form + click beacon. Twenty seconds for a mum on her
// phone: name, mobile, kids' ages, done. Fires one visit beacon on load so
// every ad click is counted even when nobody fills anything in.

import { useEffect, useRef, useState } from 'react'

function visitorId(): string {
  try {
    const k = 'bsc_vid'
    let v = localStorage.getItem(k)
    if (!v) { v = Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem(k, v) }
    return v
  } catch { return 'anon' }
}

export function WaitlistForm({ suburb, suburbLabel }: { suburb: string; suburbLabel: string }) {
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [kidsAges, setKidsAges] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const utm = useRef({ source: '', campaign: '' })

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    utm.current = { source: p.get('utm_source') ?? '', campaign: p.get('utm_campaign') ?? '' }
    fetch('/api/waitlist-visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ suburb, visitorId: visitorId(), referrer: document.referrer, utmSource: utm.current.source, utmCampaign: utm.current.campaign }),
    }).catch(() => {})
  }, [suburb])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!parentName.trim() || !phone.trim()) { setError('Your name and mobile are all we need.'); return }
    setBusy(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suburb, parentName, phone, email, kidsAges, visitorId: visitorId(), utmSource: utm.current.source, utmCampaign: utm.current.campaign }),
      })
      const d = await res.json()
      if (!d.ok) { setError(d.error || 'Something went wrong — call us on 0489 188 179.'); setBusy(false); return }
      setDone(true)
    } catch {
      setError('Something went wrong — call us on 0489 188 179.')
      setBusy(false)
    }
  }

  if (done) {
    return (
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 text-center">
        <div className="text-3xl mb-2">🎪</div>
        <div className="text-xl font-black text-emerald-900">You&apos;re on the {suburbLabel} list!</div>
        <p className="text-sm text-emerald-800 mt-2 font-bold">We&apos;ll text you the moment class times open — waitlist families pick first and get the founding-family perk.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="Your name…" className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none" />
      <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="Mobile number…" className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none" />
      <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="Email (optional)…" className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none" />
      <input value={kidsAges} onChange={(e) => setKidsAges(e.target.value)} placeholder="Kids' ages — e.g. 6 and 9…" className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none" />
      {error && <div className="bg-red-50 border-l-4 border-red-500 rounded-r-lg px-3 py-2 text-sm text-red-800 font-bold">{error}</div>}
      <button type="submit" disabled={busy} className="w-full bg-gradient-to-b from-[#D72027] to-[#A0151B] text-white font-black text-lg py-4 rounded-2xl shadow-lg hover:from-[#A0151B] hover:to-[#7d1015] disabled:opacity-60 active:scale-[0.99]">
        {busy ? 'Saving…' : `Join the ${suburbLabel} waitlist — free`}
      </button>
      <p className="text-center text-[11px] text-zinc-400">No spam, no obligation — just first pick of class times when we open. Your details stay with BigStar only.</p>
    </form>
  )
}
