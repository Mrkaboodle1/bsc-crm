import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { createAdminSupabase, CREDENTIALS_BUCKET } from '@/lib/supabase-admin'
import { DashboardShell } from '@/components/dashboard-shell'
import { CredentialUpload } from '@/components/credential-upload'
import { CredentialsManager, type CredCard } from '@/components/credentials-manager'

// /credentials — a coach's own credentials with renewal warnings + easy upload.
// One clean, de-duped list (known cards + any extras), each editable/deletable.

const WARN_DAYS = 14
function todayISO() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'Australia/Brisbane' })).toISOString().slice(0, 10) }
function daysUntil(d: string | null, t: string) { if (!d) return null; return Math.round((new Date(d.slice(0, 10) + 'T00:00:00Z').getTime() - new Date(t + 'T00:00:00Z').getTime()) / 86400000) }
function fmtDate(d: string | null) { return d ? new Date(d.slice(0, 10) + 'T00:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—' }

const KNOWN: Array<{ key: string; name: string; icon: string; note?: string }> = [
  { key: 'blue_card', name: 'Blue Card', icon: '🔵' },
  { key: 'first_aid', name: 'First Aid + CPR', icon: '🩹' },
  { key: 'public_liability', name: 'Public Liability', icon: '🛡️', note: 'Studio-wide cover held by Big Star Circus.' },
  { key: 'drivers_licence', name: "Driver's Licence", icon: '🚗' },
  { key: 'gymnastics', name: 'Coaching accreditation', icon: '🤸' },
]

export default async function CredentialsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const todayISO_ = todayISO()

  const { data: coach } = await supabase
    .from('coaches')
    .select('id, full_name, blue_card_number, blue_card_expiry, first_aid_expiry, ga_accreditation, public_liability_expiry, drivers_licence_expiry')
    .eq('user_id', user.id)
    .maybeSingle<{ id: string; full_name: string | null; blue_card_number: string | null; blue_card_expiry: string | null; first_aid_expiry: string | null; ga_accreditation: string | null; public_liability_expiry: string | null; drivers_licence_expiry: string | null }>()

  if (!coach) {
    return (
      <DashboardShell user={user} currentPath="/credentials" pageTitle="My Credentials">
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">No coach profile is linked to this login yet. Ask Rhett to connect it.</div>
      </DashboardShell>
    )
  }

  const admin = createAdminSupabase()
  const { data: docRows } = await admin.from('coach_documents').select('id, doc_type, label, file_path, expiry_on, created_at').eq('coach_id', coach.id).order('created_at', { ascending: false })
  async function urlFor(path: string | null): Promise<string | null> { if (!path) return null; const { data } = await admin.storage.from(CREDENTIALS_BUCKET).createSignedUrl(path, 3600); return data?.signedUrl ?? null }

  const colExpiry: Record<string, string | null> = {
    blue_card: coach.blue_card_expiry, first_aid: coach.first_aid_expiry,
    public_liability: coach.public_liability_expiry, drivers_licence: coach.drivers_licence_expiry, gymnastics: null,
  }

  const cards: CredCard[] = []
  const usedDocIds = new Set<string>()
  for (const k of KNOWN) {
    const doc = (docRows ?? []).find((d) => d.doc_type === k.key)
    if (doc) usedDocIds.add(doc.id)
    cards.push({
      id: doc?.id ?? null, key: k.key, name: k.name, icon: k.icon, note: k.note,
      expiry: doc?.expiry_on ?? colExpiry[k.key] ?? null,
      url: doc ? await urlFor(doc.file_path) : null,
      editable: !!doc,
    })
  }
  // Extra ("other") uploads
  for (const d of (docRows ?? [])) {
    if (d.doc_type === 'signature' || usedDocIds.has(d.id) || KNOWN.some((k) => k.key === d.doc_type)) continue
    cards.push({ id: d.id, key: 'x' + d.id, name: d.label || 'Certificate', icon: '📄', expiry: d.expiry_on, url: await urlFor(d.file_path), editable: true })
  }

  const needsAction = cards.filter((c) => { const d = daysUntil(c.expiry, todayISO_); return d !== null && d <= WARN_DAYS }).map((c) => ({ name: c.name, expiry: c.expiry, expired: (daysUntil(c.expiry, todayISO_) ?? 0) < 0 }))

  return (
    <DashboardShell user={user} currentPath="/credentials" pageTitle="My Credentials" pageSubtitle={coach.full_name ? `${coach.full_name} — keep these current` : undefined} pageActions={<CredentialUpload />}>
      {needsAction.length > 0 && (
        <div className="mb-5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4 no-print">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-extrabold text-amber-900">Action needed</div>
              <p className="text-sm text-amber-800 mt-0.5">Please renew the following within the next 2 weeks:</p>
              <ul className="mt-2 text-sm font-semibold text-amber-900 list-disc pl-5">
                {needsAction.map((n, i) => <li key={i}>{n.name} — {n.expired ? 'expired' : `due ${fmtDate(n.expiry)}`}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}
      <CredentialsManager coachName={coach.full_name ?? 'Coach'} cards={cards} />
      <p className="text-center mt-5 text-xs text-zinc-400 no-print">Tap <strong>＋ Add a credential</strong> up top to upload a photo or PDF. Something not right? Message Rhett or reply to Jacky.</p>
    </DashboardShell>
  )
}
