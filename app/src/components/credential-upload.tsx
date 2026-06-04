'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const TYPES = [
  { value: 'blue_card', label: 'Blue Card', hasExpiry: true },
  { value: 'first_aid', label: 'First Aid Certificate', hasExpiry: true },
  { value: 'ga_accreditation', label: 'Gymnastics Australia Accreditation', hasExpiry: false },
  { value: 'public_liability', label: 'Public Liability Insurance', hasExpiry: false },
  { value: 'other', label: 'Other document', hasExpiry: false },
]

export function CredentialUpload() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState('blue_card')
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const current = TYPES.find((t) => t.value === type)!

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const file = fileRef.current?.files?.[0]
    if (!file) { setError('Please choose a photo or file first.'); return }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', type)
      if (expiry) fd.append('expiry', expiry)
      const res = await fetch('/api/credentials/upload', { method: 'POST', body: fd })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Upload failed')
      setDone(true)
      setExpiry('')
      if (fileRef.current) fileRef.current.value = ''
      router.refresh()
      setTimeout(() => { setDone(false); setOpen(false) }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#D72027] text-white font-bold px-5 py-3 rounded-xl shadow-sm hover:shadow-md transition-shadow"
      >
        <span className="text-lg leading-none">＋</span> Add a credential
      </button>
    )
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border-2 border-[#D72027]/30 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-extrabold text-zinc-900">Add a credential</h3>
        <button type="button" onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700 text-sm font-semibold">Cancel</button>
      </div>

      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">What is it?</label>
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none mb-3 bg-white"
      >
        {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>

      {current.hasExpiry && (
        <>
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Expiry date (optional)</label>
          <input
            type="date"
            value={expiry}
            onChange={(e) => setExpiry(e.target.value)}
            className="w-full px-4 py-3 border-2 border-zinc-200 rounded-xl text-base focus:border-[#D72027] focus:outline-none mb-3"
          />
        </>
      )}

      <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">Photo or file</label>
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf"
        className="w-full text-sm mb-2 file:mr-3 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-zinc-100 file:font-bold file:text-zinc-700 hover:file:bg-zinc-200"
      />
      <p className="text-xs text-zinc-400 mb-3">Take a photo or upload a PDF — up to 50&nbsp;MB.</p>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 mb-3">{error}</div>}
      {done && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg px-3 py-2 mb-3">✓ Uploaded — thank you!</div>}

      <button
        type="submit"
        disabled={busy}
        className="w-full bg-[#D72027] text-white font-extrabold py-3 rounded-xl disabled:opacity-50"
      >
        {busy ? 'Uploading…' : 'Upload credential'}
      </button>
    </form>
  )
}
