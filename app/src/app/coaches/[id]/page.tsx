import { notFound, redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createAdminSupabase, CREDENTIALS_BUCKET } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'

export const dynamic = 'force-dynamic'

const WARN_DAYS = 14
function todayISO() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane' })).toISOString().slice(0, 10) }
function daysUntil(d: string | null, t: string) { if (!d) return null; return Math.round((new Date(d.slice(0, 10) + 'T00:00:00Z').getTime() - new Date(t + 'T00:00:00Z').getTime()) / 86400000) }
type St = 'missing' | 'expired' | 'expiring' | 'valid'
function statusOf(exp: string | null, has: boolean, t: string): St { if (!exp) return has ? 'valid' : 'missing'; const d = daysUntil(exp, t)!; if (d < 0) return 'expired'; if (d <= WARN_DAYS) return 'expiring'; return 'valid' }
const UI: Record<St, { label: string; cls: string; dot: string }> = {
  valid: { label: 'Valid', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  expiring: { label: 'Renew soon', cls: 'bg-amber-50 text-amber-800 border-amber-200', dot: 'bg-amber-500' },
  expired: { label: 'Expired', cls: 'bg-red-50 text-red-700 border-red-200', dot: 'bg-red-500' },
  missing: { label: 'Not on file', cls: 'bg-zinc-50 text-zinc-500 border-zinc-200', dot: 'bg-zinc-400' },
}
function fmt(d: string | null) { return d ? new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—' }
const DOC_META: Record<string, { name: string; icon: string }> = {
  blue_card: { name: 'Blue Card', icon: '🔵' }, first_aid: { name: 'First Aid + CPR', icon: '🩹' },
  public_liability: { name: 'Public Liability', icon: '🛡️' }, drivers_licence: { name: "Driver's Licence", icon: '🚗' },
  gymnastics: { name: 'Coaching accreditation', icon: '🤸' }, other: { name: 'Certificate', icon: '📄' }, signature: { name: 'Signed agreement', icon: '✍️' },
}

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await verifySession()
  if (!['owner', 'manager'].includes(user.role)) redirect('/coaches')
  const admin = createAdminSupabase()

  const { data: coach } = await admin.from('coaches').select('*').eq('id', id).eq('tenant_id', user.tenantId).maybeSingle()
  if (!coach) notFound()

  const { data: docRows } = await admin.from('coach_documents').select('id, doc_type, label, file_path, expiry_on, created_at').eq('coach_id', id).order('created_at', { ascending: false })
  const docs: Array<{ id: string; name: string; icon: string; expiry: string | null; url: string | null; type: string }> = []
  for (const d of (docRows ?? [])) {
    const meta = DOC_META[d.doc_type] || { name: d.label || 'Document', icon: '📄' }
    let url: string | null = null
    if (d.file_path) { const { data: s } = await admin.storage.from(CREDENTIALS_BUCKET).createSignedUrl(d.file_path, 3600); url = s?.signedUrl ?? null }
    docs.push({ id: d.id, name: d.doc_type === 'other' ? (d.label || 'Certificate') : meta.name, icon: meta.icon, expiry: d.expiry_on, url, type: d.doc_type })
  }
  const t = todayISO()
  const has = (k: string) => docs.some((d) => d.type === k)

  const Row = ({ label, value }: { label: string; value: string | null }) => (
    <div className="flex items-baseline justify-between gap-3 py-1.5 border-b border-zinc-100 last:border-0">
      <dt className="text-xs uppercase tracking-wider font-bold text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-semibold">{value || '—'}</dd>
    </div>
  )

  return (
    <DashboardShell user={user} currentPath="/coaches" pageTitle={coach.full_name} pageSubtitle="Coach record — cards, pay & super details"
      pageActions={<a href="/coaches" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50">← All coaches</a>}>
      <div className="grid xl:grid-cols-3 gap-6">
        {/* Left — contact + pay/super/bank */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Contact</div>
            <dl><Row label="Email" value={coach.email} /><Row label="Phone" value={coach.phone} /><Row label="Address" value={coach.address} /><Row label="Date of birth" value={fmt(coach.date_of_birth)} />
              {coach.agreement_signed_at && <Row label="Signed" value={`${coach.agreement_name || ''} · ${fmt(coach.agreement_signed_at)}`} />}
            </dl>
          </div>
          <div className="bg-white rounded-2xl border border-zinc-200 p-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Pay · super · bank <span className="text-zinc-300">(admin only)</span></div>
            <dl>
              <Row label="ABN" value={coach.abn} /><Row label="Type" value={coach.employment_type} />
              <Row label="Bank name" value={coach.bank_account_name} /><Row label="BSB" value={coach.bank_bsb} /><Row label="Account" value={coach.bank_account_number} />
              <Row label="Super fund" value={coach.super_fund_name} /><Row label="Member no" value={coach.super_member_number} /><Row label="Fund ABN" value={coach.super_fund_abn} /><Row label="Fund USI" value={coach.super_fund_usi} />
            </dl>
            <p className="text-[11px] text-zinc-400 mt-2">🔒 Tax File Number is never stored here — it&apos;s emailed to you &amp; the accountant only.</p>
          </div>
        </div>

        {/* Right — the cards */}
        <div className="xl:col-span-2">
          <h3 className="text-lg font-black text-zinc-900 mb-3">📎 Cards &amp; certificates</h3>
          {docs.filter((d) => d.type !== 'signature').length === 0 ? (
            <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">No documents uploaded yet.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {docs.filter((d) => d.type !== 'signature').map((d) => {
                const st = statusOf(d.expiry, true, t); const ui = UI[st]
                return (
                  <div key={d.id} className="bg-white rounded-2xl border border-zinc-200 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5"><span className="text-2xl">{d.icon}</span><div className="font-bold text-zinc-900 leading-tight">{d.name}</div></div>
                      {d.expiry && <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${ui.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${ui.dot}`} />{ui.label}</span>}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm"><span className="text-zinc-500">{d.expiry ? 'Expiry' : 'No expiry'}</span><span className="font-semibold text-zinc-800">{fmt(d.expiry)}</span></div>
                    <div className="mt-1.5 flex items-center justify-between text-sm"><span className="text-zinc-500">Document</span>{d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-[#D72027] hover:underline">📎 View</a> : <span className="text-zinc-400">—</span>}</div>
                  </div>
                )
              })}
            </div>
          )}
          {/* signature */}
          {docs.some((d) => d.type === 'signature') && (
            <div className="mt-4 bg-white rounded-2xl border border-zinc-200 p-4">
              <div className="font-bold text-zinc-900 mb-1">✍️ Signed BigStar agreement</div>
              {(() => { const sig = docs.find((d) => d.type === 'signature')!; return sig.url ? <a href={sig.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-[#D72027] hover:underline">View signature</a> : <span className="text-sm text-zinc-400">On file</span> })()}
            </div>
          )}
          {/* quick compliance summary */}
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {['blue_card', 'first_aid', 'public_liability', 'drivers_licence'].map((k) => (
              <span key={k} className={`px-2.5 py-1 rounded-full border font-bold ${has(k) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-50 text-zinc-400 border-zinc-200'}`}>{has(k) ? '✓' : '○'} {DOC_META[k]!.name}</span>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
