import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'

// /credentials — a coach's own credentials (blue card, first aid, etc.) with
// renewal warnings. Coaches only ever see their OWN record.

type CoachRow = {
  id: string
  full_name: string | null
  blue_card_number: string | null
  blue_card_expiry: string | null
  first_aid_expiry: string | null
  ga_accreditation: string | null
}

const WARN_DAYS = 14 // "within the next 2 weeks"

function todayBrisbaneISO() {
  const now = new Date()
  const bne = new Date(now.toLocaleString('en-US', { timeZone: 'Australia/Brisbane' }))
  return bne.toISOString().slice(0, 10)
}

function daysUntil(dateISO: string | null, todayISO: string): number | null {
  if (!dateISO) return null
  const a = new Date(todayISO + 'T00:00:00Z').getTime()
  const b = new Date(dateISO.slice(0, 10) + 'T00:00:00Z').getTime()
  return Math.round((b - a) / 86_400_000)
}

type Status = 'missing' | 'expired' | 'expiring' | 'valid'
function statusOf(expiry: string | null, hasValue: boolean, todayISO: string): Status {
  if (!expiry) return hasValue ? 'valid' : 'missing'
  const d = daysUntil(expiry, todayISO)!
  if (d < 0) return 'expired'
  if (d <= WARN_DAYS) return 'expiring'
  return 'valid'
}

const STATUS_UI: Record<Status, { label: string; cls: string; dot: string }> = {
  valid:    { label: 'Valid',          cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  expiring: { label: 'Renew soon',     cls: 'bg-amber-50 text-amber-800 border-amber-200',       dot: 'bg-amber-500' },
  expired:  { label: 'Expired',        cls: 'bg-red-50 text-red-700 border-red-200',             dot: 'bg-red-500' },
  missing:  { label: 'Not on file',    cls: 'bg-zinc-50 text-zinc-500 border-zinc-200',          dot: 'bg-zinc-400' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  const dt = new Date(d.slice(0, 10) + 'T00:00:00Z')
  return dt.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

export default async function CredentialsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const todayISO = todayBrisbaneISO()

  const { data: coach } = await supabase
    .from('coaches')
    .select('id, full_name, blue_card_number, blue_card_expiry, first_aid_expiry, ga_accreditation')
    .eq('user_id', user.id)
    .maybeSingle<CoachRow>()

  if (!coach) {
    return (
      <DashboardShell user={user} currentPath="/credentials" pageTitle="My Credentials">
        <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">
          No coach profile is linked to this login yet. Ask Rhett to connect it.
        </div>
      </DashboardShell>
    )
  }

  const items = [
    { key: 'blue', name: 'Blue Card', ref: coach.blue_card_number, expiry: coach.blue_card_expiry, hasValue: !!coach.blue_card_number, icon: '🔵' },
    { key: 'firstaid', name: 'First Aid Certificate', ref: null as string | null, expiry: coach.first_aid_expiry, hasValue: !!coach.first_aid_expiry, icon: '🩹' },
    { key: 'ga', name: 'Gymnastics Australia Accreditation', ref: coach.ga_accreditation, expiry: null as string | null, hasValue: !!coach.ga_accreditation, icon: '🤸' },
    { key: 'pl', name: 'Public Liability Insurance', ref: 'Studio-wide cover', expiry: null as string | null, hasValue: true, icon: '🛡️', note: 'Held at studio level by Big Star Circus.' },
  ] as const

  const needsAction = items
    .map((it) => ({ it, st: statusOf(it.expiry, it.hasValue, todayISO) }))
    .filter(({ st }) => st === 'expired' || st === 'expiring')

  return (
    <DashboardShell
      user={user}
      currentPath="/credentials"
      pageTitle="My Credentials"
      pageSubtitle={coach.full_name ? `${coach.full_name} — keep these current` : undefined}
    >
      {needsAction.length > 0 && (
        <div className="mb-5 rounded-2xl border-2 border-amber-300 bg-amber-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="font-extrabold text-amber-900">Action needed</div>
              <p className="text-sm text-amber-800 mt-0.5">
                Please renew the following within the next 2 weeks. Rhett and Jacky have been flagged to help you update it:
              </p>
              <ul className="mt-2 text-sm font-semibold text-amber-900 list-disc pl-5">
                {needsAction.map(({ it, st }) => (
                  <li key={it.key}>
                    {it.name} — {st === 'expired' ? 'expired' : `due ${fmtDate(it.expiry)}`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const st = statusOf(it.expiry, it.hasValue, todayISO)
          const ui = STATUS_UI[st]
          return (
            <div key={it.key} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{it.icon}</span>
                  <div>
                    <div className="font-bold text-zinc-900 leading-tight">{it.name}</div>
                    {it.ref && <div className="text-xs text-zinc-500 mt-0.5">{it.ref}</div>}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full border ${ui.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${ui.dot}`} />
                  {ui.label}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-zinc-500">Expiry</span>
                <span className="font-semibold text-zinc-800">{fmtDate(it.expiry)}</span>
              </div>
              {'note' in it && it.note && (
                <p className="mt-2 text-xs text-zinc-400">{it.note}</p>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-center mt-5 text-xs text-zinc-400">
        Something not right? Message Rhett or reply to Jacky and we&apos;ll update it.
      </p>
    </DashboardShell>
  )
}
