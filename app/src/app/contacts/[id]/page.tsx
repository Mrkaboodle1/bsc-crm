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
import { ContactProfileEditor, ContactKidsEditor } from './contact-profile-editor'
import { ContactAppointments } from './contact-appointments'
import { Composer } from './composer'
import { DndPanel, type DndState } from './dnd-panel'
import { ContactTasksPanel, type ContactTask } from './contact-tasks-panel'
import { WaiverCards, type Waiver } from './waiver-cards'
import { getContactPayments, customerLink } from '@/lib/stripe-payments'

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

  // DND state — pulled in a SEPARATE query so the page still renders if
  // migration 007 hasn't been applied yet (columns not present → defaults).
  const { data: dndRow } = await supabase
    .from('families')
    .select('dnd_email, dnd_sms, dnd_calls, dnd_all')
    .eq('id', id)
    .maybeSingle()
  const dnd: DndState = {
    email: Boolean(dndRow && (dndRow as Record<string, unknown>).dnd_email),
    sms:   Boolean(dndRow && (dndRow as Record<string, unknown>).dnd_sms),
    calls: Boolean(dndRow && (dndRow as Record<string, unknown>).dnd_calls),
    all:   Boolean(dndRow && (dndRow as Record<string, unknown>).dnd_all),
  }

  // Forms & waivers pulled from Tectonic — child names, medical, source, class.
  const waiverFilter = family.email
    ? `family_id.eq.${family.id},email.eq.${family.email.toLowerCase()}`
    : `family_id.eq.${family.id}`
  const { data: waiversData } = await supabase
    .from('signed_waivers')
    .select('id, event_type, children, medical, emergency, answers, created_at')
    .or(waiverFilter)
    .order('created_at', { ascending: false })
    .limit(10)
  const waivers = (waiversData ?? []) as Array<{ id: string; event_type: string | null; children: string | null; medical: string | null; emergency: string | null; answers: Record<string, unknown> | null; created_at: string }>
  const ans = (w: { answers: Record<string, unknown> | null }) => (w.answers ?? {}) as Record<string, unknown>
  const latestSource = (waivers.map(ans).find((a) => a.source)?.source as string) || family.source || null
  const latestHeard = (waivers.map(ans).find((a) => a.how_heard)?.how_heard as string) || null

  // Payment history — Stripe charges for subscribers + one-off SHW/KNO payments from bookings.
  const stripePayments = await getContactPayments({ customerId: family.stripe_customer_id })
  const wbFilter = family.email ? `family_id.eq.${family.id},email.eq.${family.email.toLowerCase()}` : `family_id.eq.${family.id}`
  const { data: wbRows } = await supabase
    .from('workshop_bookings')
    .select('id, amount_paid, paid, created_at, holiday_workshops(date, title)')
    .or(wbFilter)
  const workshopPayments = (wbRows ?? [])
    .filter((b) => b.paid && (Number(b.amount_paid) || 0) > 0)
    .map((b) => {
      const w = Array.isArray(b.holiday_workshops) ? b.holiday_workshops[0] : b.holiday_workshops
      const isKno = /kids night out/i.test((w?.title as string) || '')
      const dateStr = w?.date ? new Date((w.date as string) + 'T00:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }) : ''
      return { id: b.id as string, amount: Number(b.amount_paid) || 0, currency: 'aud', description: `${isKno ? 'Kids Night Out' : 'Holiday Workshop'}${dateStr ? ' — ' + dateStr : ''}`, status: 'succeeded', created: Math.floor(new Date((w?.date as string) || b.created_at).getTime() / 1000), refunded: false, link: customerLink(family.stripe_customer_id) }
    })
  const payments = [...stripePayments, ...workshopPayments].sort((a, b) => b.created - a.created)
  const totalPaid = payments.reduce((s, p) => s + (p.refunded ? 0 : p.amount), 0)

  const students = (family.students ?? []) as Array<{ id: string; first_name: string; last_name: string | null; date_of_birth: string | null }>

  // Classes (for the "add to class" picker) + each kid's current classes.
  const kidIds = students.map((s) => s.id)
  const [{ data: classList }, { data: enrolRows }] = await Promise.all([
    supabase.from('classes').select('id, name').eq('tenant_id', user.tenantId).eq('status', 'active').order('name'),
    kidIds.length
      ? supabase.from('enrolments').select('id, student_id, class_id, status, classes(name)').in('student_id', kidIds).eq('status', 'active')
      : Promise.resolve({ data: [] as never[] }),
  ])
  const enrolmentsByKid: Record<string, Array<{ id: string; classId: string; className: string }>> = {}
  for (const e of (enrolRows ?? []) as Array<{ id: string; student_id: string; class_id: string; classes: { name: string }[] | { name: string } | null }>) {
    const cn = Array.isArray(e.classes) ? e.classes[0]?.name : e.classes?.name
    ;(enrolmentsByKid[e.student_id] ||= []).push({ id: e.id, classId: e.class_id, className: cn || 'Class' })
  }
  const classes = (classList ?? []) as Array<{ id: string; name: string }>
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

  // Appointments for this family (right rail — editable)
  const [{ data: upcomingAppts }, { data: coachesData }] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, title, type, start_at, end_at, all_day, location, description, notes, assigned_coach_id, fee, status')
      .eq('related_family_id', family.id)
      .order('start_at', { ascending: false })
      .limit(10),
    supabase.from('coaches').select('id, full_name').order('full_name'),
  ])
  const coachList = (coachesData ?? []) as { id: string; full_name: string }[]

  // Tasks for this contact — degrade gracefully if migration 008 not applied
  const { data: tasksData, error: tasksErr } = await supabase
    .from('tasks')
    .select('id, title, description, status, priority, due_at, created_at')
    .eq('related_family_id', family.id)
    .eq('tenant_id', user.tenantId)
    .order('status', { ascending: true }) // 'cancelled' < 'done' < 'in_progress' < 'open' alpha
    .order('due_at', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(50)
  const tasksTableMissing =
    !!tasksErr && (tasksErr.message.includes('does not exist') || tasksErr.message.includes('relation'))
  const contactTasks: ContactTask[] = (tasksData ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    dueAt: t.due_at,
  }))

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
          <ContactProfileEditor
            family={{
              id: family.id, family_name: family.family_name, primary_parent: family.primary_parent,
              email: family.email, phone: family.phone, emergency_phone: family.emergency_phone,
              address: family.address, source: family.source, lifecycle_stage: family.lifecycle_stage,
            }}
            tagPicker={<TagPicker contactId={family.id} initialTags={family.tags ?? []} />}
          />

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

          {/* Kids — editable */}
          <ContactKidsEditor familyId={family.id} initial={students} classes={classes} enrolments={enrolmentsByKid} />

          {/* Forms & Waivers — click a card to see the full form + signature */}
          <WaiverCards waivers={waivers as Waiver[]} />
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
          <ContactTasksPanel
            contactId={family.id}
            initial={contactTasks}
            tableMissing={tasksTableMissing}
          />
          <ContactAppointments appts={(upcomingAppts ?? []) as never} coaches={coachList} familyId={family.id} />
          <RailPanel icon="💲" label="Payments" count={payments.length}>
            <div className="text-xs space-y-1.5">
              {(family.weekly_fee_total ?? 0) > 0 && <div className="flex items-baseline justify-between"><span className="font-bold text-zinc-800">Weekly fee</span><span className="font-bold text-zinc-900">${family.weekly_fee_total}/wk</span></div>}
              {activeSubs.map((s) => <div key={s.id} className="flex items-baseline justify-between"><span className="capitalize text-zinc-600">{(s.plan ?? '—').replace('_', ' ')}</span><span className="text-zinc-500">${s.weekly_amount ?? '?'}</span></div>)}
              {payments.length > 0 ? (
                <div className="pt-1.5 mt-1 border-t border-zinc-100 space-y-1.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-400">Payment history · ${totalPaid.toFixed(0)} paid</div>
                  {payments.map((p) => {
                    const inner = (
                      <>
                        <span className="text-zinc-600 truncate group-hover:text-[#635BFF]" title={p.description ?? ''}>{new Date(p.created * 1000).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} · {p.description || 'Payment'}{p.link && <span className="text-zinc-300"> ↗</span>}</span>
                        <span className={`shrink-0 font-bold ${p.refunded ? 'text-zinc-400 line-through' : 'text-emerald-700'}`}>${p.amount.toFixed(0)}</span>
                      </>
                    )
                    return p.link
                      ? <a key={p.id} href={p.link} target="_blank" rel="noreferrer" className="group flex items-baseline justify-between gap-2 hover:bg-zinc-50 rounded px-1 -mx-1">{inner}</a>
                      : <div key={p.id} className="flex items-baseline justify-between gap-2">{inner}</div>
                  })}
                </div>
              ) : (family.weekly_fee_total ?? 0) === 0 && activeSubs.length === 0 ? (
                <p className="text-zinc-500">No payments on file yet.</p>
              ) : null}
              {family.stripe_customer_id && <a href={`https://dashboard.stripe.com/customers/${family.stripe_customer_id}`} target="_blank" rel="noreferrer" className="inline-block text-[#635BFF] font-bold pt-1">Open in Stripe →</a>}
            </div>
          </RailPanel>
          <RailPanel icon="🔗" label="Attribution">
            {latestSource || latestHeard ? (
              <div className="text-xs space-y-1">
                {latestSource && <div><span className="font-bold text-zinc-700">Source:</span> <span className="text-zinc-600">{latestSource}</span></div>}
                {latestHeard && <div><span className="font-bold text-zinc-700">Heard via:</span> <span className="text-zinc-600">{latestHeard}</span></div>}
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No source on file yet.</p>
            )}
          </RailPanel>

          {/* DND + delete — Tectonic equivalent of the DND tab */}
          <DndPanel
            contactId={family.id}
            contactName={family.primary_parent ?? family.family_name}
            initial={dnd}
          />
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

