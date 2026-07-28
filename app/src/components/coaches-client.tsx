'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Plus, Pencil, Trash2, X, KeyRound, Check } from 'lucide-react'

export type Coach = {
  id: string; full_name: string; email: string | null; phone: string | null
  role: string | null; employment_type: string | null; pay_rate: number | null; skills: string[]
  blue_card_number: string | null; blue_card_expiry: string | null; first_aid_expiry: string | null
  ga_accreditation: string | null; status: string
  abn?: string | null; tfn_held?: boolean; super_paid?: boolean; pay_note?: string | null
}
export type ClassLite = { id: string; name: string; day_of_week: number; start_time: string; primary_coach_id: string | null }

const ROLE_CLS: Record<string, string> = { head: 'bg-[#D72027] text-white', adult: 'bg-blue-100 text-blue-800', trainee: 'bg-amber-100 text-amber-800', casual: 'bg-zinc-100 text-zinc-700' }
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const input = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('') || '?'

export function CoachesClient({ coaches, classes, loginEmails, canManage }: { coaches: Coach[]; classes: ClassLite[]; loginEmails: string[]; canManage: boolean }) {
  const [editing, setEditing] = useState<Coach | 'new' | null>(null)
  const hasLogin = (c: Coach) => !!c.email && loginEmails.includes(c.email.toLowerCase())

  const today = new Date(); const in60 = new Date(today); in60.setDate(in60.getDate() + 60)
  const expBlue = coaches.filter((c) => c.blue_card_expiry && new Date(c.blue_card_expiry) <= in60).length
  const expAid = coaches.filter((c) => c.first_aid_expiry && new Date(c.first_aid_expiry) <= in60).length

  return (
    <>
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Stat icon="🤝" label="Active coaches" value={coaches.length} />
        <Stat icon="👤" label="Head coaches" value={coaches.filter((c) => c.role === 'head').length} />
        <Stat icon="🛡" label="Blue card expiring (60d)" value={expBlue} alert={expBlue > 0} />
        <Stat icon="🚑" label="First aid expiring (60d)" value={expAid} alert={expAid > 0} />
      </section>

      {canManage && (
        <div className="flex justify-end mb-3">
          <button onClick={() => setEditing('new')} className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-4 py-2 rounded-lg"><Plus size={15} /> Add team member</button>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200">
            <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
              <th className="px-5 py-3">Coach</th>
              <th className="px-4 py-3 hidden md:table-cell">Skills</th>
              <th className="px-4 py-3 hidden lg:table-cell">Blue card</th>
              <th className="px-4 py-3 hidden lg:table-cell">First aid</th>
              <th className="px-4 py-3 hidden xl:table-cell">Login</th>
              <th className="px-4 py-3 text-right">Rate</th>
              {canManage && <th className="px-4 py-3 text-right">Manage</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {coaches.map((c) => (
              <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-full bg-zinc-200 text-zinc-700 flex items-center justify-center text-xs font-extrabold shrink-0">{initials(c.full_name)}</span>
                    <div className="min-w-0">
                      <div className="font-extrabold text-zinc-900 truncate">{c.full_name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {c.role && <span className={`text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded ${ROLE_CLS[c.role] ?? 'bg-zinc-100 text-zinc-700'}`}>{c.role}</span>}
                        {c.employment_type && <span className="text-[10px] text-zinc-500 truncate">{c.employment_type.replace('_', ' ')}</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 hidden md:table-cell"><div className="flex flex-wrap gap-1">{(c.skills ?? []).slice(0, 5).map((s) => <span key={s} className="text-[10px] bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded font-bold">{s}</span>)}</div></td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs"><ExpiryPill date={c.blue_card_expiry} /></td>
                <td className="px-4 py-3 hidden lg:table-cell text-xs"><ExpiryPill date={c.first_aid_expiry} /></td>
                <td className="px-4 py-3 hidden xl:table-cell text-xs">{hasLogin(c) ? <span className="inline-flex items-center gap-1 text-emerald-700 font-bold"><Check size={12} /> Yes</span> : <span className="text-zinc-400">—</span>}</td>
                <td className="px-4 py-3 text-right font-extrabold text-zinc-900">{c.pay_rate !== null ? `$${c.pay_rate}` : '—'}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <a href={`/coaches/${c.id}`} className="inline-flex text-zinc-400 hover:text-[#D72027] p-1.5" title="Cards & details">📎</a>
                    <button onClick={() => setEditing(c)} className="text-zinc-400 hover:text-zinc-800 p-1.5" title="Edit"><Pencil size={15} /></button>
                    <button onClick={async () => { if (window.confirm(`Remove ${c.full_name} from the team?`)) { await fetch(`/api/coaches?id=${c.id}`, { method: 'DELETE' }); location.reload() } }} className="text-zinc-400 hover:text-red-600 p-1.5" title="Remove"><Trash2 size={15} /></button>
                  </td>
                )}
              </tr>
            ))}
            {coaches.length === 0 && <tr><td colSpan={canManage ? 7 : 6} className="px-5 py-10 text-center text-zinc-500">No coaches yet.</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && createPortal(<CoachModal coach={editing === 'new' ? null : editing} classes={classes} hasLogin={editing !== 'new' && hasLogin(editing)} onClose={() => setEditing(null)} />, document.body)}
    </>
  )
}

function CoachModal({ coach, classes, hasLogin, onClose }: { coach: Coach | null; classes: ClassLite[]; hasLogin: boolean; onClose: () => void }) {
  const router = useRouter()
  const isNew = !coach
  const [f, setF] = useState({
    full_name: coach?.full_name || '', role: coach?.role || 'adult', employment_type: coach?.employment_type || 'contractor',
    pay_rate: coach?.pay_rate?.toString() || '', email: coach?.email || '', phone: coach?.phone || '',
    skills: (coach?.skills || []).join(', '),
    blue_card_number: coach?.blue_card_number || '', blue_card_expiry: coach?.blue_card_expiry || '',
    first_aid_expiry: coach?.first_aid_expiry || '', ga_accreditation: coach?.ga_accreditation || 'none',
    abn: coach?.abn || '', tfn_held: coach?.tfn_held ?? false, super_paid: coach?.super_paid ?? false, pay_note: coach?.pay_note || '',
  })
  const [classIds, setClassIds] = useState<string[]>(classes.filter((c) => coach && c.primary_coach_id === coach.id).map((c) => c.id))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [pw, setPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  const toggleClass = (id: string) => setClassIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])

  async function save() {
    if (!f.full_name.trim()) { setErr('Name is required'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/coaches', { method: isNew ? 'POST' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: coach?.id, ...f, class_ids: classIds }) })
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Could not save') }
      router.refresh(); onClose()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }
  async function setLogin() {
    setPwMsg(''); if (pw.length < 6) { setPwMsg('Use at least 6 characters'); return }
    setBusy(true)
    try {
      const r = await fetch('/api/coaches/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ coach_id: coach?.id, password: pw }) })
      const j = await r.json()
      setPwMsg(r.ok ? `✓ Login set for ${j.email}` : j.error || 'Failed')
      if (r.ok) router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100 sticky top-0 bg-white"><h3 className="font-extrabold text-zinc-900">{isNew ? 'Add team member' : `Edit ${coach!.full_name}`}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-5">
          {/* Details */}
          <div className="grid sm:grid-cols-2 gap-4">
            <L label="Full name *"><input className={input} value={f.full_name} onChange={(e) => set('full_name', e.target.value)} /></L>
            <L label="Role"><select className={input} value={f.role} onChange={(e) => set('role', e.target.value)}><option value="head">Head coach</option><option value="adult">Coach (adult)</option><option value="trainee">Trainee</option><option value="casual">Casual</option></select></L>
            <L label="Employment"><select className={input} value={f.employment_type} onChange={(e) => set('employment_type', e.target.value)}><option value="employee_casual">Employee — casual</option><option value="employee_parttime">Employee — part time</option><option value="contractor">Contractor</option><option value="trainee_honorarium">Trainee honorarium</option></select></L>
            <L label="Pay rate ($/hr)"><input type="number" className={input} value={f.pay_rate} onChange={(e) => set('pay_rate', e.target.value)} /></L>
            <L label="Email"><input className={input} value={f.email} onChange={(e) => set('email', e.target.value)} placeholder="name@bigstarcircus.com.au" /></L>
            <L label="Phone"><input className={input} value={f.phone} onChange={(e) => set('phone', e.target.value)} /></L>
          </div>
          <L label="Skills (comma separated)"><input className={input} value={f.skills} onChange={(e) => set('skills', e.target.value)} placeholder="acro, aerial, juggling" /></L>

          {/* Credentials */}
          <div className="border-t border-zinc-100 pt-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">Credentials & compliance</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <L label="Blue Card number"><input className={input} value={f.blue_card_number} onChange={(e) => set('blue_card_number', e.target.value)} /></L>
              <L label="Blue Card expiry"><input type="date" className={input} value={f.blue_card_expiry || ''} onChange={(e) => set('blue_card_expiry', e.target.value)} /></L>
              <L label="First Aid expiry"><input type="date" className={input} value={f.first_aid_expiry || ''} onChange={(e) => set('first_aid_expiry', e.target.value)} /></L>
              <L label="Gymnastics accreditation"><select className={input} value={f.ga_accreditation} onChange={(e) => set('ga_accreditation', e.target.value)}><option value="none">None</option><option value="fundamental">Fundamental</option><option value="intermediate">Intermediate</option><option value="advanced">Advanced</option></select></L>
            </div>
          </div>

          {/* Pay & tax */}
          <div className="border-t border-zinc-100 pt-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">Pay & tax</div>
            <div className="grid sm:grid-cols-2 gap-4">
              <L label="ABN (contractors)"><input className={input} value={f.abn} onChange={(e) => set('abn', e.target.value)} placeholder="For contractors who invoice you" /></L>
              <L label="Pay note"><input className={input} value={f.pay_note} onChange={(e) => set('pay_note', e.target.value)} placeholder="e.g. Junior rate, invoices monthly" /></L>
            </div>
            <div className="flex flex-wrap gap-4 text-sm mt-3">
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.tfn_held} onChange={(e) => setF((p) => ({ ...p, tfn_held: e.target.checked }))} /> TFN on file (employees)</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={f.super_paid} onChange={(e) => setF((p) => ({ ...p, super_paid: e.target.checked }))} /> Super paid</label>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">Tip: contractors invoice you with an ABN; under-18 casuals working ≤30 hrs/week don&apos;t need super. Confirm with your accountant.</p>
          </div>

          {/* Class assignment */}
          <div className="border-t border-zinc-100 pt-4">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">Classes they teach <span className="text-zinc-400 font-medium normal-case">— shows on their tablet Roll Call</span></div>
            {classes.length === 0 ? <p className="text-sm text-zinc-400">No classes set up yet.</p> : (
              <div className="grid sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg hover:bg-zinc-50 cursor-pointer">
                    <input type="checkbox" checked={classIds.includes(c.id)} onChange={() => toggleClass(c.id)} />
                    <span className="text-zinc-700"><span className="font-semibold">{DAYS[c.day_of_week]}</span> {c.start_time?.slice(0, 5)} · {c.name}{c.primary_coach_id && c.primary_coach_id !== coach?.id ? <span className="text-[10px] text-amber-600"> (assigned elsewhere)</span> : ''}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Tablet login */}
          {!isNew && (
            <div className="border-t border-zinc-100 pt-4">
              <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5"><KeyRound size={13} /> Tablet login</div>
              {!f.email ? <p className="text-sm text-amber-700">Add an email above and Save first, then you can set their login.</p> : (
                <>
                  <p className="text-xs text-zinc-500 mb-2">{hasLogin ? 'This coach can already log in. Set a new password below to reset it.' : 'Give them a password so they can sign in on the studio tablet (they only see their Roll Call).'}</p>
                  <div className="flex gap-2">
                    <input className={input} type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Set a password (min 6 chars)" />
                    <button onClick={setLogin} disabled={busy} className="shrink-0 bg-zinc-900 text-white font-semibold text-sm px-4 rounded-lg disabled:opacity-50">Set login</button>
                  </div>
                  {pwMsg && <p className={`text-xs mt-1.5 ${pwMsg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{pwMsg}</p>}
                  {f.email && <p className="text-[11px] text-zinc-400 mt-1.5">They log in at the login page with <strong>{f.email}</strong> + this password.</p>}
                </>
              )}
            </div>
          )}

          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2 pt-1 border-t border-zinc-100 -mx-5 px-5 pt-4">
            <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : isNew ? 'Add member' : 'Save changes'}</button>
            <button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="block text-xs font-semibold text-zinc-600 mb-1">{label}</span>{children}</label>
}
function ExpiryPill({ date }: { date: string | null }) {
  if (!date) return <span className="text-zinc-400">—</span>
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
  if (days < 0) return <span className="bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded">Expired</span>
  if (days <= 30) return <span className="bg-red-100 text-red-800 font-extrabold px-2 py-0.5 rounded">{date} ({days}d)</span>
  if (days <= 60) return <span className="bg-amber-100 text-amber-800 font-extrabold px-2 py-0.5 rounded">{date} ({days}d)</span>
  return <span className="text-zinc-600">{date}</span>
}
function Stat({ icon, label, value, alert }: { icon: string; label: string; value: number; alert?: boolean }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border ${alert ? 'border-amber-300' : 'border-zinc-200'} p-4 relative overflow-hidden`}>
      {alert && <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" aria-hidden />}
      <div className="flex items-center gap-3"><span className="text-2xl">{icon}</span><div><div className="text-2xl font-extrabold text-zinc-900 leading-none">{value}</div><div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mt-1">{label}</div></div></div>
    </div>
  )
}
