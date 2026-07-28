'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Check, ArrowRight, ArrowLeft, Rocket, Store, IdCard, ShieldCheck, Users, CalendarDays, Globe } from 'lucide-react'
import { uploadMedia } from '@/app/media/actions'

type Props = {
  tenant: {
    name: string | null; phone: string | null; email: string | null; website: string | null
    address: string | null; abn: string | null; logo_url: string | null
    primary_colour: string | null; accent_colour: string | null
    tagline: string | null; mission: string | null
    socials: { facebook?: string; instagram?: string; youtube?: string; tiktok?: string }
  }
  starband: { auto_text: boolean; default_mode: string }
  productCount: number
  planCount: number
}

const input = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'
const STEPS = ['Business', 'Brand', 'Safety', 'Catalogue', 'Done']

export function SetupWizard({ tenant, starband, productCount, planCount }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState(false)
  const logoInput = useRef<HTMLInputElement>(null)

  const [f, setF] = useState({
    name: tenant.name || '', phone: tenant.phone || '', email: tenant.email || '', website: tenant.website || '',
    address: tenant.address || '', abn: tenant.abn || '', logo_url: tenant.logo_url || '',
    primary_colour: tenant.primary_colour || '#D72027', accent_colour: tenant.accent_colour || '#FFC107',
    tagline: tenant.tagline || '', mission: tenant.mission || '',
    facebook: tenant.socials?.facebook || '', instagram: tenant.socials?.instagram || '', youtube: tenant.socials?.youtube || '', tiktok: tenant.socials?.tiktok || '',
    auto_text: starband.auto_text, default_mode: starband.default_mode || 'tap',
  })
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }))

  async function uploadLogo(file: File | null) {
    if (!file) return
    setUploading(true); setErr('')
    try {
      const fd = new FormData(); fd.append('file', file); fd.append('alt', `${f.name || 'Business'} logo`)
      const res = await uploadMedia(fd)
      if (!res.ok) throw new Error(res.error)
      set('logo_url', res.data.url)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed') } finally { setUploading(false) }
  }

  async function saveAndNext() {
    setBusy(true); setErr('')
    try {
      if (step === 0) {
        await post('/api/settings', { name: f.name, phone: f.phone, email: f.email, website: f.website, address: f.address, abn: f.abn, logo_url: f.logo_url, primary_colour: f.primary_colour, accent_colour: f.accent_colour })
      } else if (step === 1) {
        await post('/api/settings', { profile: { tagline: f.tagline, mission: f.mission, socials: { facebook: f.facebook, instagram: f.instagram, youtube: f.youtube, tiktok: f.tiktok } } })
      } else if (step === 2) {
        await post('/api/starband/settings', { auto_text: f.auto_text, mode: f.default_mode })
      }
      router.refresh()
      setStep((s) => Math.min(STEPS.length - 1, s + 1))
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save') } finally { setBusy(false) }
  }
  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Save failed') }
  }

  return (
    <div className="max-w-2xl">
      {/* Stepper */}
      <div className="flex items-center gap-1.5 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < step ? 'bg-emerald-500 text-white' : i === step ? 'bg-[#D72027] text-white' : 'bg-zinc-200 text-zinc-500'}`}>{i < step ? <Check size={14} /> : i + 1}</div>
            {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < step ? 'bg-emerald-500' : 'bg-zinc-200'}`} />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 p-6">
        {step === 0 && (
          <div className="space-y-4">
            <Head icon={<Store size={20} />} title="Your business" sub="The essentials — these appear across the whole platform." />
            <div className="grid sm:grid-cols-2 gap-4">
              <L label="Business name *"><input className={input} value={f.name} onChange={(e) => set('name', e.target.value)} /></L>
              <L label="ABN"><input className={input} value={f.abn} onChange={(e) => set('abn', e.target.value)} /></L>
              <L label="Phone"><input className={input} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></L>
              <L label="Email"><input className={input} value={f.email} onChange={(e) => set('email', e.target.value)} /></L>
              <L label="Website"><input className={input} value={f.website} onChange={(e) => set('website', e.target.value)} placeholder="https://…" /></L>
              <L label="Address"><input className={input} value={f.address} onChange={(e) => set('address', e.target.value)} /></L>
            </div>
            <div className="flex items-center gap-4 pt-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.logo_url ? <img src={f.logo_url} alt="logo" className="w-14 h-14 rounded-lg object-contain border border-zinc-200 bg-zinc-50 p-1" /> : <div className="w-14 h-14 rounded-lg border border-dashed border-zinc-300 bg-zinc-50" />}
              <div>
                <input ref={logoInput} type="file" accept="image/*" className="hidden" onChange={(e) => uploadLogo(e.target.files?.[0] ?? null)} />
                <button type="button" onClick={() => logoInput.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 bg-zinc-900 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"><Upload size={15} /> {uploading ? 'Uploading…' : 'Upload logo'}</button>
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <L label="Primary"><input type="color" value={f.primary_colour} onChange={(e) => set('primary_colour', e.target.value)} className="w-10 h-9 rounded border border-zinc-200" /></L>
                <L label="Accent"><input type="color" value={f.accent_colour} onChange={(e) => set('accent_colour', e.target.value)} className="w-10 h-9 rounded border border-zinc-200" /></L>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <Head icon={<IdCard size={20} />} title="Your brand voice" sub="Used in AI-written copy, your website and email footer." />
            <L label="Tagline"><input className={input} value={f.tagline} onChange={(e) => set('tagline', e.target.value)} placeholder="One short line that sums you up" /></L>
            <L label="Mission / about"><textarea rows={2} className={input} value={f.mission} onChange={(e) => set('mission', e.target.value)} placeholder="A sentence or two about what you do and who for." /></L>
            <div className="grid sm:grid-cols-2 gap-4">
              <L label="Facebook"><input className={input} value={f.facebook} onChange={(e) => set('facebook', e.target.value)} placeholder="https://facebook.com/…" /></L>
              <L label="Instagram"><input className={input} value={f.instagram} onChange={(e) => set('instagram', e.target.value)} placeholder="https://instagram.com/…" /></L>
              <L label="YouTube"><input className={input} value={f.youtube} onChange={(e) => set('youtube', e.target.value)} placeholder="https://youtube.com/@…" /></L>
              <L label="TikTok"><input className={input} value={f.tiktok} onChange={(e) => set('tiktok', e.target.value)} placeholder="https://tiktok.com/@…" /></L>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Head icon={<ShieldCheck size={20} />} title="Child safety (StarBand)" sub="How children check in and out — and whether parents get a text." />
            <label className="flex items-start gap-3 p-3 rounded-lg border border-zinc-200 cursor-pointer">
              <input type="checkbox" checked={f.auto_text} onChange={(e) => set('auto_text', e.target.checked)} className="mt-1" />
              <span><span className="font-semibold text-sm text-zinc-900">Text parents on check-in & check-out</span><span className="block text-xs text-zinc-500">A safety message lets parents know their child arrived and was collected. (Needs SMS credit.)</span></span>
            </label>
            <L label="Default check-in method">
              <select className={input} value={f.default_mode} onChange={(e) => set('default_mode', e.target.value)}>
                <option value="tap">Wristband tap (NFC)</option>
                <option value="faces">Photo / face tap</option>
                <option value="pin">4-digit PIN</option>
              </select>
            </L>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Head icon={<Store size={20} />} title="Your catalogue" sub="Products for the till & shop, and your membership plans." />
            <Row label="Products (till & shop)" value={`${productCount} set up`} href="/pos" cta="Manage products" />
            <Row label="Membership plans" value={`${planCount} set up`} href="/memberships" cta="Manage plans" />
            <p className="text-xs text-zinc-500">Starter products and plans are pre-loaded — tweak names and prices to suit you, or add your own.</p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Head icon={<Rocket size={20} />} title="You're set up! 🎉" sub="The platform is now yours. Here's where to go next." />
            <div className="grid sm:grid-cols-2 gap-3">
              <Next icon={<Users size={16} />} title="Import your contacts" href="/families/import" />
              <Next icon={<CalendarDays size={16} />} title="Add your classes" href="/classes" />
              <Next icon={<Store size={16} />} title="Check your till" href="/pos" />
              <Next icon={<Globe size={16} />} title="Build your website" href="/sites" />
            </div>
          </div>
        )}

        {err && <p className="text-sm text-red-600 mt-4">{err}</p>}

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-zinc-100">
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 disabled:opacity-0"><ArrowLeft size={15} /> Back</button>
          {step < 3 ? (
            <button onClick={saveAndNext} disabled={busy || (step === 0 && !f.name)} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : 'Save & continue'} <ArrowRight size={15} /></button>
          ) : step === 3 ? (
            <button onClick={() => setStep(4)} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg">Finish <ArrowRight size={15} /></button>
          ) : (
            <a href="/dashboard" className="inline-flex items-center gap-1.5 bg-zinc-900 text-white font-semibold text-sm px-5 py-2.5 rounded-lg">Go to dashboard <ArrowRight size={15} /></a>
          )}
        </div>
      </div>
    </div>
  )
}

function Head({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <div className="w-10 h-10 rounded-xl bg-[#D72027]/10 text-[#D72027] flex items-center justify-center shrink-0">{icon}</div>
      <div><h2 className="font-extrabold text-zinc-900">{title}</h2><p className="text-sm text-zinc-500">{sub}</p></div>
    </div>
  )
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-semibold text-zinc-600 mb-1">{label}</span>{children}</label>
}
function Row({ label, value, href, cta }: { label: string; value: string; href: string; cta: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-zinc-200">
      <div><div className="font-semibold text-sm text-zinc-900">{label}</div><div className="text-xs text-emerald-600 font-medium">{value}</div></div>
      <a href={href} className="text-sm font-semibold text-zinc-700 border border-zinc-200 rounded-lg px-3 py-1.5 hover:bg-zinc-50">{cta}</a>
    </div>
  )
}
function Next({ icon, title, href }: { icon: React.ReactNode; title: string; href: string }) {
  return <a href={href} className="flex items-center gap-2.5 p-3 rounded-lg border border-zinc-200 hover:border-[#D72027] hover:bg-zinc-50 font-semibold text-sm text-zinc-800">{icon} {title} <ArrowRight size={14} className="ml-auto text-zinc-400" /></a>
}
