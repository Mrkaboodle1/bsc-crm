// Contact detail — Tectonic-style 3-column layout:
//   Left: profile (avatar, owner, followers, tags, contact fields, source,
//         payment status, Stripe link)
//   Middle: composer + conversation timeline
//   Right: quick rail (Tasks · Notes · Appointments · Payments) — deferred
//          panels render coming-soon for phase 2.
//
// All data backed by the existing families / email_messages / pending_actions /
// appointments / subscriptions tables. Nothing new in the DB.

import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { TagPicker } from './tag-picker'
import { Composer } from './composer'

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  lead: 'bg-amber-100 text-amber-800',
  paused: 'bg-zinc-100 text-zinc-600',
  past: 'bg-zinc-100 text-zinc-500',
  lost: 'bg-red-50 text-red-700',
}

const SOURCE_LABEL: Record<string, string> = {
  fb_ad: '📘 Facebook ad',
  instagram: '📸 Instagram',
  google: '🔍 Google search',
  word_of_mouth: '💬 Word of mouth',
  school: '🏫 School',
  walkin: '🚪 Walk-in',
  open_day: '🎪 Open day',
  email: '✉️ Email',
  other: '✨ Other',
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: family, error } = await supabase
    .from('families')
    .select(`
      id, family_name, primary_parent, email, phone, emergency_phone,
      address, source, lifecycle_stage, stripe_customer_id, weekly_fee_total,
      notes, tags, created_at, updated_at,
      students:students!students_family_id_fkey ( id, first_name, last_name, date_of_birth ),
      subscriptions:subscriptions!subscriptions_family_id_fkey (
        id, plan, weekly_amount, status, current_period_end, next_charge_date
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !family) notFound()

  const students = (family.students ?? []) as Array<{ id: string; first_name: string; last_name: string | null; date_of_birth: string | null }>
  const subs = (family.subscriptions ?? []) as Array<{ id: string; plan: string | null; weekly_amount: number | null; status: string; current_period_end: string | null; next_charge_date: string | null }>
  const activeSubs = subs.filter((s) => s.status === 'active')

  // Conversation: emails + drafts + internal notes — chronological newest first
  const emailFilter = family.email
    ? `matched_family_id.eq.${family.id},from_email.eq.${family.email}`
    : `matched_family_id.eq.${family.id}`
  const [emailsRes, actionsRes] = await Promise.all([
    supabase
      .from('email_messages')
      .select('id, from_email, from_name, subject, body_preview:body_text, received_at')
      .or(emailFilter)
      .order('received_at', { ascending: false })
      .limit(30),
    supabase
      .from('pending_actions')
      .select('id, kind, status, draft_subject, draft_body, draft_recipient, draft_metadata, created_at, sent_at, approved_at, reasoning')
      .eq('related_family_id', family.id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  type TimelineItem =
    | { kind: 'inbound'; id: string; at: string; subject: string | null; preview: string | null; sender: string }
    | { kind: 'outbound'; id: string; at: string; subject: string | null; body: string; channel: 'email' | 'sms' | 'note'; status: string; isInternal: boolean }
  const timeline: TimelineItem[] = []
  for (const e of emailsRes.data ?? []) {
    timeline.push({
      kind: 'inbound',
      id: e.id,
      at: e.received_at,
      subject: e.subject,
      preview: e.body_preview?.slice(0, 280) ?? null,
      sender: e.from_name ?? e.from_email ?? 'Unknown',
    })
  }
  for (const a of actionsRes.data ?? []) {
    const channel: 'email' | 'sms' | 'note' = a.kind?.startsWith('sms') ? 'sms' : a.kind === 'note' ? 'note' : 'email'
    const meta = (a.draft_metadata ?? {}) as Record<string, unknown>
    const isInternal = meta.is_internal === true || channel === 'note'
    timeline.push({
      kind: 'outbound',
      id: a.id,
      at: a.sent_at ?? a.approved_at ?? a.created_at,
      subject: a.draft_subject,
      body: a.draft_body ?? '',
      channel,
      status: a.status,
      isInternal,
    })
  }
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  // Recent appointments (right rail)
  const { data: upcomingAppts } = await supabase
    .from('appointments')
    .select('id, title, type, start_at, status')
    .eq('related_family_id', family.id)
    .order('start_at', { ascending: false })
    .limit(5)

  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle={family.primary_parent ?? family.family_name}
      pageSubtitle={family.primary_parent ? `${family.family_name} family` : 'Contact'}
      pageActions={
        <div className="flex items-center gap-2">
          <a
            href={`/jacky?prefill=${encodeURIComponent(`Tell me everything you know about the ${family.family_name} family and draft me a follow-up.`)}`}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
          >
            🎪 Ask Jacky
          </a>
          <a
            href="/contacts"
            className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
          >
            ← All contacts
          </a>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* LEFT — profile */}
        <aside className="xl:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-base font-extrabold shrink-0">
                {initials(family.primary_parent ?? family.family_name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-lg font-extrabold text-zinc-900 truncate">
                  {family.primary_parent ?? family.family_name}
                </div>
                {family.primary_parent && (
                  <div className="text-xs text-zinc-500 truncate">{family.family_name} family</div>
                )}
                {family.lifecycle_stage && (
                  <span className={`inline-block mt-1.5 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${LIFECYCLE_CLS[family.lifecycle_stage] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {family.lifecycle_stage}
                  </span>
                )}
              </div>
            </div>

            {/* Tag picker */}
            <div className="mb-4">
              <TagPicker contactId={family.id} initialTags={family.tags ?? []} />
            </div>

            {/* Contact fields */}
            <dl className="space-y-2 text-sm border-t border-zinc-100 pt-3">
              <Row label="Email" value={family.email} link={family.email ? `mailto:${family.email}` : null} />
              <Row label="Phone" value={family.phone} link={family.phone ? `tel:${family.phone}` : null} />
              {family.emergency_phone && <Row label="Emergency" value={family.emergency_phone} />}
              {family.address && <Row label="Address" value={family.address} />}
              <Row label="Source" value={family.source ? (SOURCE_LABEL[family.source] ?? family.source) : '—'} />
              <Row label="Created" value={family.created_at ? new Date(family.created_at).toLocaleDateString('en-AU') : '—'} />
            </dl>
          </div>

          {/* Billing */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
              Billing
            </div>
            <div className="text-2xl font-extrabold text-zinc-900">
              ${family.weekly_fee_total ?? 0}/week
            </div>
            {activeSubs.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-xs">
                {activeSubs.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between">
                    <span className="font-bold text-zinc-700 capitalize">{(s.plan ?? '—').replace('_', ' ')}</span>
                    <span className="text-zinc-500">next: {s.next_charge_date ?? '—'}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500 mt-2">No active subscription on file.</p>
            )}
            {family.stripe_customer_id && (
              <a
                href={`https://dashboard.stripe.com/customers/${family.stripe_customer_id}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#635BFF] hover:underline"
              >
                Open in Stripe →
              </a>
            )}
          </div>

          {/* Kids */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
              Kids ({students.length})
            </div>
            {students.length === 0 ? (
              <p className="text-xs text-zinc-500">No kids linked yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {students.map((s) => (
                  <li key={s.id}>
                    <a href={`/students/${s.id}`} className="text-sm font-bold text-zinc-700 hover:text-[#D72027] hover:underline">
                      {s.first_name} {s.last_name ?? ''} {s.date_of_birth && `· ${yearsOld(s.date_of_birth)}y`}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* MIDDLE — composer + conversation */}
        <main className="xl:col-span-5 space-y-4">
          <Composer
            contactId={family.id}
            hasEmail={!!family.email}
            hasPhone={!!family.phone}
          />

          {/* Conversation timeline */}
          <section>
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
              Conversation ({timeline.length})
            </div>
            {timeline.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center text-sm text-zinc-500">
                No messages yet. Anything you queue above lands in /inbox for approval.
              </div>
            ) : (
              <ul className="space-y-2">
                {timeline.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className={`rounded-xl p-3 border ${
                      item.kind === 'inbound'
                        ? 'bg-blue-50 border-blue-200'
                        : item.kind === 'outbound' && item.isInternal
                        ? 'bg-amber-50 border-amber-200'
                        : item.kind === 'outbound' && item.status === 'sent'
                        ? 'bg-emerald-50 border-emerald-200'
                        : 'bg-white border-zinc-200'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-600">
                        {item.kind === 'inbound'
                          ? `📨 from ${item.sender}`
                          : item.kind === 'outbound' && item.isInternal
                          ? `👁 internal note`
                          : item.kind === 'outbound'
                          ? `${item.channel === 'sms' ? '💬' : '✉️'} ${item.status.toUpperCase()}`
                          : ''}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(item.at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    {item.kind === 'inbound' && item.subject && (
                      <div className="text-sm font-bold text-zinc-900">{item.subject}</div>
                    )}
                    {item.kind === 'inbound' && item.preview && (
                      <div className="text-xs text-zinc-600 mt-1 line-clamp-3 whitespace-pre-wrap">{item.preview}</div>
                    )}
                    {item.kind === 'outbound' && item.subject && (
                      <div className="text-sm font-bold text-zinc-900">{item.subject}</div>
                    )}
                    {item.kind === 'outbound' && (
                      <div className="text-xs text-zinc-700 mt-1 line-clamp-4 whitespace-pre-wrap">{item.body}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </main>

        {/* RIGHT — quick rail */}
        <aside className="xl:col-span-3 space-y-3">
          <RailPanel icon="✅" label="Tasks" count={0} body="Coming soon — phase 2." />
          <RailPanel icon="📅" label="Appointments" count={upcomingAppts?.length ?? 0}>
            {!upcomingAppts || upcomingAppts.length === 0 ? (
              <p className="text-xs text-zinc-500">None on file.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {upcomingAppts.map((a) => (
                  <li key={a.id}>
                    <div className="font-bold text-zinc-800 truncate">{a.title}</div>
                    <div className="text-[10px] text-zinc-500">{new Date(a.start_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</div>
                  </li>
                ))}
              </ul>
            )}
          </RailPanel>
          <RailPanel icon="💲" label="Payments" count={activeSubs.length}>
            {activeSubs.length === 0 ? (
              <p className="text-xs text-zinc-500">No active subscriptions.</p>
            ) : (
              <ul className="space-y-1.5 text-xs">
                {activeSubs.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between">
                    <span className="font-bold capitalize text-zinc-800">{(s.plan ?? '—').replace('_', ' ')}</span>
                    <span className="text-zinc-500">${s.weekly_amount ?? '?'}</span>
                  </li>
                ))}
              </ul>
            )}
          </RailPanel>
          <RailPanel icon="🔗" label="Attribution" body="Page-tracking pixel comes in phase 3. First / latest source will appear here." />
        </aside>
      </div>

      {/* Bottom — old free-text notes field, kept for legacy */}
      {family.notes && (
        <div className="mt-6 bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">Legacy notes</div>
          <p className="text-sm text-zinc-700 whitespace-pre-wrap">{family.notes}</p>
        </div>
      )}
    </DashboardShell>
  )
}

function Row({ label, value, link }: { label: string; value: string | null; link?: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-bold truncate">
        {value ? (link ? <a href={link} className="hover:underline">{value}</a> : value) : '—'}
      </dd>
    </div>
  )
}

function RailPanel({
  icon,
  label,
  count,
  body,
  children,
}: {
  icon: string
  label: string
  count?: number
  body?: string
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-xs font-extrabold text-zinc-700">
          <span className="mr-1">{icon}</span>
          {label}
        </div>
        {typeof count === 'number' && count > 0 && (
          <span className="text-[10px] font-extrabold bg-zinc-100 text-zinc-700 px-1.5 py-0.5 rounded">{count}</span>
        )}
      </div>
      {body && <p className="text-xs text-zinc-500">{body}</p>}
      {children}
    </div>
  )
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0]![0] + parts[parts.length - 1]![0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function yearsOld(dob: string): number {
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}
