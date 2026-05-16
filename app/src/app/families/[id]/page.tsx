import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'

const LIFECYCLE_CLS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-800',
  trial: 'bg-blue-100 text-blue-800',
  lead: 'bg-amber-100 text-amber-800',
  paused: 'bg-zinc-100 text-zinc-600',
  past: 'bg-zinc-100 text-zinc-500',
  lost: 'bg-red-50 text-red-700',
}

export default async function FamilyProfilePage({
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
      notes, tags, created_at,
      students:students!students_family_id_fkey (
        id, first_name, last_name, date_of_birth, total_stars, star_tier
      ),
      subscriptions:subscriptions!subscriptions_family_id_fkey (
        id, plan, weekly_amount, status, current_period_end, next_charge_date
      )
    `)
    .eq('id', id)
    .maybeSingle()

  if (error || !family) notFound()

  // Pull the full communication history for this family — emails Jacky's seen
  // plus drafts she's queued. We OR-match on (matched_family_id = this family)
  // and (from_email = this family's email) to catch emails that came in before
  // a family record existed.
  const emailFilter = family.email
    ? `matched_family_id.eq.${family.id},from_email.eq.${family.email}`
    : `matched_family_id.eq.${family.id}`
  const [emailsRes, actionsRes] = await Promise.all([
    supabase
      .from('email_messages')
      .select('id, from_email, from_name, subject, body_preview:body_text, received_at, classification, to_emails')
      .or(emailFilter)
      .order('received_at', { ascending: false })
      .limit(20),
    supabase
      .from('pending_actions')
      .select('id, kind, status, priority, draft_subject, draft_body, draft_recipient, reasoning, created_at, sent_at, approved_at')
      .eq('related_family_id', family.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])
  const emails = emailsRes.data ?? []
  const actions = actionsRes.data ?? []

  // Build a unified timeline (newest first) blending inbound emails + outbound drafts.
  type TimelineItem =
    | { kind: 'email'; id: string; at: string; subject: string | null; preview: string | null; direction: 'in'; sender: string }
    | { kind: 'action'; id: string; at: string; subject: string | null; preview: string | null; status: string; channel: string; recipient: string | null }
  const timeline: TimelineItem[] = []
  for (const e of emails) {
    const sentToAdmin = (e.to_emails ?? []).some((t: string) => t?.toLowerCase() === 'admin@bigstarcircus.com.au')
    timeline.push({
      kind: 'email',
      id: e.id,
      at: e.received_at,
      subject: e.subject,
      preview: e.body_preview?.slice(0, 200) ?? null,
      direction: sentToAdmin || (e.from_email !== 'admin@bigstarcircus.com.au') ? 'in' : 'in',
      sender: e.from_name ?? e.from_email ?? 'Unknown',
    })
  }
  for (const a of actions) {
    timeline.push({
      kind: 'action',
      id: a.id,
      at: a.sent_at ?? a.approved_at ?? a.created_at,
      subject: a.draft_subject,
      preview: a.draft_body?.slice(0, 200) ?? null,
      status: a.status,
      channel: a.kind?.startsWith('sms') ? 'sms' : 'email',
      recipient: a.draft_recipient,
    })
  }
  timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

  const students = (family.students ?? []) as Array<{
    id: string
    first_name: string
    last_name: string | null
    date_of_birth: string | null
    total_stars: number
    star_tier: number
  }>
  const subs = (family.subscriptions ?? []) as Array<{
    id: string
    plan: string | null
    weekly_amount: number | null
    status: string
    current_period_end: string | null
    next_charge_date: string | null
  }>

  const activeSubs = subs.filter((s) => s.status === 'active')

  return (
    <DashboardShell
      user={user}
      currentPath="/families"
      pageTitle={family.family_name}
      pageSubtitle={family.primary_parent ?? 'Family profile'}
      pageActions={
        <div className="flex items-center gap-2">
          <a
            href={`/jacky?prefill=${encodeURIComponent(`Tell me everything you know about the ${family.family_name} family. Show me recent emails and any drafts pending.`)}`}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
          >
            🎪 Ask Jacky
          </a>
          <a
            href="/families"
            className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
          >
            ← All families
          </a>
        </div>
      }
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — contact + lifecycle */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-14 h-14 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center text-base font-extrabold shrink-0">
                {family.family_name.slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0">
                {family.lifecycle_stage && (
                  <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${LIFECYCLE_CLS[family.lifecycle_stage] ?? 'bg-zinc-100 text-zinc-500'}`}>
                    {family.lifecycle_stage}
                  </span>
                )}
                <div className="text-lg font-extrabold text-zinc-900 mt-1 truncate">
                  {family.family_name}
                </div>
              </div>
            </div>
            <dl className="space-y-2 text-sm">
              {family.primary_parent && <Row label="Primary parent" value={family.primary_parent} />}
              {family.email && <Row label="Email" value={family.email} />}
              {family.phone && <Row label="Phone" value={family.phone} />}
              {family.emergency_phone && <Row label="Emergency" value={family.emergency_phone} />}
              {family.address && <Row label="Address" value={family.address} />}
              {family.source && <Row label="Source" value={family.source} />}
            </dl>
            {family.tags && family.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {family.tags.map((t: string) => (
                  <span key={t} className="text-[10px] font-extrabold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Billing */}
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
              Billing
            </div>
            <div className="text-2xl font-extrabold text-zinc-900 mb-1">
              ${family.weekly_fee_total ?? 0}/week
            </div>
            {activeSubs.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm">
                {activeSubs.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-bold text-zinc-700 capitalize">{(s.plan ?? '—').replace('_', ' ')}</span>
                    <span className="text-zinc-500">
                      next: {s.next_charge_date ?? '—'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500 mt-1">No active subscription on file.</p>
            )}
            {family.stripe_customer_id && (
              <div className="mt-3 text-[10px] text-zinc-400 font-mono">
                Stripe: {family.stripe_customer_id}
              </div>
            )}
          </div>
        </div>

        {/* Right — kids + notes */}
        <div className="xl:col-span-2 space-y-6">
          <section>
            <h3 className="text-lg font-extrabold text-zinc-900 mb-3">
              Kids ({students.length})
            </h3>
            {students.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center text-sm text-zinc-500">
                No kids linked to this family yet.
              </div>
            ) : (
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {students.map((s) => (
                  <li key={s.id}>
                    <a
                      href={`/students/${s.id}`}
                      className="block bg-white rounded-2xl shadow-sm border border-zinc-200 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-12 h-12 rounded-full bg-gradient-to-br from-[#D72027] to-[#FFC107] text-white flex items-center justify-center text-sm font-extrabold shrink-0">
                          {(s.first_name[0] || '?') + (s.last_name?.[0] ?? '')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="font-extrabold text-zinc-900 truncate">
                            {s.first_name} {s.last_name ?? ''}
                          </div>
                          <div className="text-xs text-zinc-500 mt-0.5">
                            {yearsOld(s.date_of_birth) !== null ? `${yearsOld(s.date_of_birth)}y · ` : ''}
                            Tier {s.star_tier}
                          </div>
                          <div className="text-xs mt-1">
                            <span className="text-base">{'⭐'.repeat(s.star_tier)}</span>
                            <span className="text-zinc-500 ml-2 text-[10px] font-bold uppercase tracking-wider">{s.total_stars} stars</span>
                          </div>
                        </div>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {family.notes && (
            <section className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
                Notes
              </h3>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap">{family.notes}</p>
            </section>
          )}

          {/* Communications timeline — emails received from this family + drafts queued/sent */}
          <section>
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-lg font-extrabold text-zinc-900">
                Communications ({timeline.length})
              </h3>
              <div className="flex gap-2">
                <a
                  href={`/jacky?prefill=${encodeURIComponent(`Draft a friendly email to the ${family.family_name} family at ${family.email ?? '(no email on file)'}. Keep it warm and short.`)}`}
                  className="text-xs font-bold text-[#D72027] hover:underline"
                >
                  ✉️ Draft email
                </a>
                {family.phone && (
                  <a
                    href={`/jacky?prefill=${encodeURIComponent(`Draft a short SMS to the ${family.family_name} family at ${family.phone}. Keep it under 160 chars.`)}`}
                    className="text-xs font-bold text-[#D72027] hover:underline"
                  >
                    📱 Draft SMS
                  </a>
                )}
              </div>
            </div>
            {timeline.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-6 text-center text-sm text-zinc-500">
                No conversation history yet. When this family emails admin@ or Jacky drafts a reply, it&apos;ll appear here.
              </div>
            ) : (
              <ul className="space-y-2">
                {timeline.map((item) => (
                  <li
                    key={`${item.kind}-${item.id}`}
                    className={`rounded-xl border bg-white p-3 ${
                      item.kind === 'email'
                        ? 'border-l-4 border-l-blue-500 border-zinc-200'
                        : item.status === 'sent'
                        ? 'border-l-4 border-l-emerald-500 border-zinc-200'
                        : item.status === 'pending'
                        ? 'border-l-4 border-l-amber-500 border-zinc-200'
                        : 'border-zinc-200'
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2 mb-1">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-zinc-500">
                        {item.kind === 'email'
                          ? `📨 INBOUND from ${item.sender}`
                          : item.kind === 'action'
                          ? `${item.channel === 'sms' ? '📱' : '📧'} ${item.status.toUpperCase()} → ${item.recipient ?? ''}`
                          : ''}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {new Date(item.at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>
                    {item.subject && (
                      <div className="text-sm font-bold text-zinc-900 truncate">{item.subject}</div>
                    )}
                    {item.preview && (
                      <div className="text-xs text-zinc-600 mt-1 line-clamp-2">{item.preview}</div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </DashboardShell>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-xs uppercase tracking-wider font-bold text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-bold truncate">{value}</dd>
    </div>
  )
}

function yearsOld(dob: string | null): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const m = now.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--
  return age
}
