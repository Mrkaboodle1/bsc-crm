'use client'

// Client-side renderer for the `form` block on public site pages.
// Posts to the same lead endpoint the /f/<slug> funnel forms use
// (/api/forms/submit — JSON only), so site-page enquiries land in the CRM
// as leads + inbox notes exactly like every other web form.

import { useState } from 'react'
import type { FormField } from '@/lib/sites/blocks'

// Field names the API understands natively — anything else still arrives
// via the structured `answers` array.
const KNOWN = new Set(['name', 'email', 'phone', 'childAge', 'message'])

export function SiteForm({ title, submitLabel, fields }: { title?: string; submitLabel?: string; fields: FormField[] }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('sending')
    const fd = new FormData(e.currentTarget)
    const body: Record<string, unknown> = { formSlug: 'website' } // source marker → tags ['web-form','website']
    const answers: { label: string; value: string; type: string }[] = []
    for (const f of fields) {
      const value = (fd.get(f.name) ?? '').toString()
      if (KNOWN.has(f.name)) body[f.name] = value
      answers.push({ label: f.label, value, type: f.type })
    }
    body.answers = answers
    try {
      const r = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!r.ok) throw new Error()
      setState('done')
    } catch {
      setState('error')
    }
  }

  return (
    // id="form" — the free-trial template CTA links to '#form'.
    <section id="form" className="bg-white rounded-2xl shadow-md border border-zinc-200 p-6 my-6">
      {title && <h2 className="text-xl font-extrabold text-zinc-900 mb-4">{title}</h2>}
      {state === 'done' ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🎪</div>
          <p className="text-lg font-extrabold text-zinc-900">Thank you!</p>
          <p className="text-sm text-zinc-600 mt-1">We&apos;ve got your details and the Big Star team will be in touch very soon.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          {fields.map((f, i) => (
            <FieldView key={i} field={f} />
          ))}
          {state === 'error' && (
            <p className="text-sm text-red-600">Please add your name and an email or phone, then try again.</p>
          )}
          <button
            type="submit"
            disabled={state === 'sending'}
            className="w-full bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-base px-6 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-60"
          >
            {state === 'sending' ? 'Sending…' : (submitLabel ?? 'Submit')}
          </button>
        </form>
      )}
    </section>
  )
}

function FieldView({ field }: { field: FormField }) {
  const label = (
    <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-600 mb-1">
      {field.label}{field.required && <span className="text-[#D72027] ml-0.5">*</span>}
    </label>
  )
  const baseCls =
    'w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none'
  if (field.type === 'textarea') {
    return (
      <div>
        {label}
        <textarea name={field.name} rows={field.rows ?? 4} placeholder={field.placeholder} className={baseCls} required={field.required} />
      </div>
    )
  }
  return (
    <div>
      {label}
      <input
        type={field.type === 'phone' ? 'tel' : field.type}
        name={field.name}
        placeholder={field.placeholder}
        className={baseCls}
        required={field.required}
      />
    </div>
  )
}
