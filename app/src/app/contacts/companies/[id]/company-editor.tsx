'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { updateCompany, deleteCompany } from '../actions'

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'school', label: '🏫 School' },
  { value: 'ndis_provider', label: '💜 NDIS provider' },
  { value: 'supplier', label: '📦 Supplier' },
  { value: 'partner', label: '🤝 Partner' },
  { value: 'venue', label: '🎪 Venue' },
  { value: 'other', label: '✨ Other' },
]

export type CompanyForEdit = {
  id: string
  name: string
  category: string | null
  email: string | null
  phone: string | null
  website: string | null
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  description: string | null
  notes: string | null
}

const FIELD = 'w-full px-3 py-2 border-2 border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'
const LABEL = 'text-[10px] uppercase tracking-wider font-bold text-zinc-500 mb-1 block'

export function CompanyEditButton({ company }: { company: CompanyForEdit }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CompanyForEdit>(company)

  function set<K extends keyof CompanyForEdit>(key: K, val: CompanyForEdit[K]) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function save() {
    setSaving(true)
    setError(null)
    const patch: Record<string, string | null> = {
      name: form.name.trim(),
      category: form.category || null,
      email: form.email?.trim() || null,
      phone: form.phone?.trim() || null,
      website: form.website?.trim() || null,
      address: form.address?.trim() || null,
      city: form.city?.trim() || null,
      state: form.state?.trim() || null,
      postal_code: form.postal_code?.trim() || null,
      description: form.description?.trim() || null,
      notes: form.notes?.trim() || null,
    }
    if (!patch.name) {
      setError('Name is required')
      setSaving(false)
      return
    }
    const res = await updateCompany({ id: company.id, patch })
    setSaving(false)
    if (!res.ok) {
      setError(res.error)
      return
    }
    setEditing(false)
    router.refresh()
  }

  async function remove() {
    if (!confirm(`Delete "${company.name}"? This cannot be undone.`)) return
    setDeleting(true)
    const res = await deleteCompany({ id: company.id })
    if (!res.ok) {
      setError(res.error)
      setDeleting(false)
      return
    }
    router.push('/contacts/companies')
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => { setForm(company); setEditing(true) }}
          className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ✏️ Edit
        </button>
        <button
          onClick={remove}
          disabled={deleting}
          className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : '🗑 Delete'}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border-2 border-[#D72027] p-5 space-y-3">
      <div className="text-[10px] font-extrabold uppercase tracking-wider text-[#D72027] mb-1">Editing company</div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

      <div>
        <label className={LABEL}>Company name *</label>
        <input className={FIELD} value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      <div>
        <label className={LABEL}>Category</label>
        <select className={FIELD} value={form.category ?? ''} onChange={(e) => set('category', e.target.value || null)}>
          <option value="">— None —</option>
          {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Email</label>
          <input className={FIELD} value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Phone</label>
          <input className={FIELD} value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Website</label>
        <input className={FIELD} value={form.website ?? ''} onChange={(e) => set('website', e.target.value)} placeholder="https://" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>Address</label>
          <input className={FIELD} value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Suburb / City</label>
          <input className={FIELD} value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={LABEL}>State</label>
          <input className={FIELD} value={form.state ?? ''} onChange={(e) => set('state', e.target.value)} />
        </div>
        <div>
          <label className={LABEL}>Postcode</label>
          <input className={FIELD} value={form.postal_code ?? ''} onChange={(e) => set('postal_code', e.target.value)} />
        </div>
      </div>

      <div>
        <label className={LABEL}>Description</label>
        <textarea className={FIELD} rows={2} value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
      </div>

      <div>
        <label className={LABEL}>Notes</label>
        <textarea className={FIELD} rows={2} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-2.5 rounded-lg shadow hover:shadow-md disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
        <button
          onClick={() => { setEditing(false); setError(null) }}
          className="bg-white border border-zinc-200 text-zinc-600 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
