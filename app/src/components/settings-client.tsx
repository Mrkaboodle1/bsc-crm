'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, User, CreditCard, UsersRound, Mail, MessageSquare, CalendarDays, Plug, SlidersHorizontal, Upload, Tag, ScrollText, Bold, Italic, ImagePlus, RotateCcw } from 'lucide-react'

export type TenantProfile = {
  name: string | null; abn: string | null; email: string | null; phone: string | null
  website: string | null; address: string | null; founded_year: number | null
  primary_colour: string | null; accent_colour: string | null; logo_url: string | null
  slug: string | null; plan: string | null; email_signature: string | null
}

const CATS = [
  { group: 'My Business', items: [
    { key: 'profile', label: 'Business Profile', Icon: Building2 }, { key: 'myprofile', label: 'My Profile', Icon: User },
    { key: 'billing', label: 'Billing', Icon: CreditCard }, { key: 'staff', label: 'Staff', Icon: UsersRound },
  ] },
  { group: 'Services', items: [
    { key: 'email', label: 'Email', Icon: Mail }, { key: 'sms', label: 'SMS', Icon: MessageSquare }, { key: 'calendars', label: 'Calendars', Icon: CalendarDays },
  ] },
  { group: 'Other', items: [
    { key: 'integrations', label: 'Integrations', Icon: Plug }, { key: 'fields', label: 'Custom Fields', Icon: SlidersHorizontal },
    { key: 'import', label: 'Import Data', Icon: Upload }, { key: 'tags', label: 'Tags', Icon: Tag }, { key: 'audit', label: 'Audit Log', Icon: ScrollText },
  ] },
]

export function SettingsClient({ tenant }: { tenant: TenantProfile }) {
  const [cat, setCat] = useState('profile')
  const labelFor = CATS.flatMap((g) => g.items).find((i) => i.key === cat)?.label || 'Settings'
  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-6">
      {/* Secondary sub-nav */}
      <nav className="space-y-5">
        {CATS.map((g) => (
          <div key={g.group}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5 px-2">{g.group}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => (
                <li key={it.key}>
                  <button onClick={() => setCat(it.key)} className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-left transition-colors ${cat === it.key ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800'}`}>
                    <it.Icon size={16} />{it.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Panel */}
      <div>
        {cat === 'profile' ? <BusinessProfile tenant={tenant} />
          : cat === 'email' ? <EmailSettings tenant={tenant} />
          : (
          <div className="bg-white rounded-xl border border-zinc-200 p-12 text-center">
            <h3 className="font-semibold text-zinc-800 mb-1">{labelFor}</h3>
            <p className="text-sm text-zinc-500">This settings area is part of the staged rollout and is coming soon.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function defaultSignature(t: TenantProfile): string {
  return [
    'Warm regards,',
    `The ${t.name || 'Big Star Circus'} Team`,
    '',
    `Phone: ${t.phone || '0489 188 179'}`,
    `Email: ${t.email || 'admin@bigstarcircus.com.au'}`,
    `Web: ${(t.website || 'bigstarcircus.com.au').replace(/^https?:\/\//, '')}`,
    t.address || 'Unit 1/14 Harper Street, Molendinar QLD 4214',
  ].join('\n')
}

const BSC_LOGO_URL = 'https://app-chi-silk-29.vercel.app/bigstar-logo.png'

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
function defaultSignatureHtml(t: TenantProfile): string {
  return defaultSignature(t).split('\n').map((line) => `<div>${escapeHtml(line) || '<br>'}</div>`).join('')
}
// A stored signature might be old plain text — turn it into HTML so the editor shows it nicely.
function toHtml(stored: string | null, t: TenantProfile): string {
  if (!stored || !stored.trim()) return defaultSignatureHtml(t)
  if (/<\w+[^>]*>/.test(stored)) return stored // already HTML
  return stored.split('\n').map((line) => `<div>${escapeHtml(line) || '<br>'}</div>`).join('')
}

function EmailSettings({ tenant }: { tenant: TenantProfile }) {
  const router = useRouter()
  const editorRef = useRef<HTMLDivElement>(null)
  const initial = toHtml(tenant.email_signature, tenant)
  const [html, setHtml] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')

  // Seed the editable area once (uncontrolled, so the cursor doesn't jump).
  useEffect(() => { if (editorRef.current) editorRef.current.innerHTML = initial }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const sync = () => { if (editorRef.current) setHtml(editorRef.current.innerHTML) }
  function exec(cmd: string, value?: string) {
    editorRef.current?.focus()
    document.execCommand(cmd, false, value)
    sync()
  }
  function insertImage(url: string) {
    if (!url) return
    editorRef.current?.focus()
    document.execCommand('insertHTML', false, `<img src="${url}" alt="logo" style="max-height:64px;display:block;margin:4px 0;" />`)
    sync()
  }
  function resetTemplate() {
    const t = defaultSignatureHtml(tenant)
    if (editorRef.current) editorRef.current.innerHTML = t
    setHtml(t)
  }

  async function save() {
    setBusy(true); setErr(''); setDone(false)
    try {
      const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email_signature: editorRef.current?.innerHTML ?? html }) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      setDone(true); router.refresh(); setTimeout(() => setDone(false), 2500)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }

  const Tool = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} title={title} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-semibold text-zinc-600 hover:bg-zinc-100">{children}</button>
  )

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-zinc-900">Email signature</h3>
          <button onClick={resetTemplate} className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 inline-flex items-center gap-1"><RotateCcw size={12} /> Reset to template</button>
        </div>
        <p className="text-sm text-zinc-500 mb-4">Goes at the bottom of every email the CRM sends. Type your text and drop your logo in — exactly how you want it to look.</p>

        {/* Toolbar */}
        <div className="flex items-center gap-1 border border-zinc-200 rounded-t-lg bg-zinc-50 px-2 py-1.5 flex-wrap">
          <Tool onClick={() => exec('bold')} title="Bold"><Bold size={14} /></Tool>
          <Tool onClick={() => exec('italic')} title="Italic"><Italic size={14} /></Tool>
          <span className="w-px h-5 bg-zinc-200 mx-1" />
          <Tool onClick={() => insertImage(BSC_LOGO_URL)} title="Insert your Big Star logo"><ImagePlus size={14} /> Insert logo</Tool>
          <Tool onClick={() => { const u = window.prompt('Paste the web link (URL) of the image to insert:'); if (u) insertImage(u.trim()) }} title="Insert another image"><ImagePlus size={14} /> Insert image…</Tool>
        </div>
        {/* Editable area */}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          className="min-h-[180px] border border-t-0 border-zinc-200 rounded-b-lg px-4 py-3 text-sm text-zinc-800 leading-relaxed focus:outline-none focus:border-zinc-400 [&_img]:inline-block"
        />
        <p className="text-[11px] text-zinc-400 mt-2">Tip: click <strong>Insert logo</strong> to drop your Big Star logo in. Want a different image? Use <strong>Insert image…</strong> and paste its web link — or send it to me and I&apos;ll host it for you.</p>

        <div className="mt-5">
          <div className="text-xs font-semibold text-zinc-600 mb-1.5">Preview — how the bottom of your emails will look</div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm text-zinc-500 italic mb-3">…your message will appear here, then:</p>
            <div className="border-t border-zinc-200 pt-3 text-sm text-zinc-700 leading-relaxed [&_img]:max-h-16" dangerouslySetInnerHTML={{ __html: html || '<span style="color:#a1a1aa">No signature yet.</span>' }} />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save signature'}</button>
        {done && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 text-sm">
        <strong>Resend is connected</strong> — login links already send reliably. This signature (text + logo) will appear on parent &amp; bulk emails once that feature is switched on.
      </div>
    </div>
  )
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-zinc-400 mt-1">{hint}</p>}
    </div>
  )
}
const input = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'

function BusinessProfile({ tenant }: { tenant: TenantProfile }) {
  const router = useRouter()
  const [f, setF] = useState({
    name: tenant.name || '', abn: tenant.abn || '', email: tenant.email || '', phone: tenant.phone || '',
    website: tenant.website || '', address: tenant.address || '', founded_year: tenant.founded_year || '',
    primary_colour: tenant.primary_colour || '#D72027', accent_colour: tenant.accent_colour || '#FFC107', logo_url: tenant.logo_url || '',
  })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function save() {
    setBusy(true); setErr(''); setDone(false)
    try {
      const r = await fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      setDone(true); router.refresh(); setTimeout(() => setDone(false), 2500)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="font-semibold text-zinc-900 mb-1">General information</h3>
        <p className="text-sm text-zinc-500 mb-5">Your business details, shown across the platform and on invoices.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Business name"><input className={input} value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="ABN"><input className={input} value={f.abn} onChange={(e) => set('abn', e.target.value)} /></Field>
          <Field label="Business email"><input className={input} value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Business phone"><input className={input} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Website"><input className={input} value={f.website} onChange={(e) => set('website', e.target.value)} /></Field>
          <Field label="Founded year"><input className={input} value={String(f.founded_year)} onChange={(e) => set('founded_year', e.target.value)} /></Field>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="font-semibold text-zinc-900 mb-5">Business address</h3>
        <Field label="Physical address"><textarea className={input} rows={2} value={f.address} onChange={(e) => set('address', e.target.value)} /></Field>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-6">
        <h3 className="font-semibold text-zinc-900 mb-1">Brand</h3>
        <p className="text-sm text-zinc-500 mb-5">Your logo and brand colours.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Logo URL"><input className={input} value={f.logo_url} onChange={(e) => set('logo_url', e.target.value)} placeholder="https://…" /></Field>
          <Field label="Primary colour">
            <div className="flex items-center gap-2"><input type="color" value={f.primary_colour} onChange={(e) => set('primary_colour', e.target.value)} className="w-10 h-9 rounded border border-zinc-200" /><input className={input} value={f.primary_colour} onChange={(e) => set('primary_colour', e.target.value)} /></div>
          </Field>
          <Field label="Accent colour">
            <div className="flex items-center gap-2"><input type="color" value={f.accent_colour} onChange={(e) => set('accent_colour', e.target.value)} className="w-10 h-9 rounded border border-zinc-200" /><input className={input} value={f.accent_colour} onChange={(e) => set('accent_colour', e.target.value)} /></div>
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save changes'}</button>
        {done && <span className="text-sm text-emerald-600 font-medium">✓ Saved</span>}
        {err && <span className="text-sm text-red-600">{err}</span>}
      </div>
    </div>
  )
}
