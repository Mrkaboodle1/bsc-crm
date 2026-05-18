// /contacts — same underlying `families` table, Tectonic-style list view.
// Adds: tag pills column, attribution source column, last-activity timestamp,
// payment status pill. URL params: ?q= search · ?stage= lifecycle filter
// · ?tag= tag filter · ?source= attribution source.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContactsSubnav } from '@/components/contacts-subnav'
import { ContactsListView, type ContactRow } from './contacts-list-view'
import { SmartListTabs } from './smart-list-tabs'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; tag?: string; source?: string; show?: string; list?: string }>
}) {
  const rawParams = await searchParams
  const showPlaceholders = rawParams.show === 'placeholders'
  const user = await verifySession()
  const supabase = await createServerSupabase()

  // Smart Lists — fetch all saved ones for the tab strip
  const { data: savedListsRaw } = await supabase
    .from('smart_lists')
    .select('id, name, criteria')
    .eq('tenant_id', user.tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })
  const savedLists = (savedListsRaw ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    criteria: (s.criteria ?? {}) as Record<string, unknown>,
  }))
  const activeList = rawParams.list ? savedLists.find((l) => l.id === rawParams.list) ?? null : null

  // Merge active smart list criteria with URL params (URL wins on conflict)
  const merged: Record<string, string> = {}
  if (activeList) {
    for (const [k, v] of Object.entries(activeList.criteria)) {
      if (typeof v === 'string') merged[k] = v
    }
  }
  for (const [k, v] of Object.entries(rawParams)) {
    if (typeof v === 'string') merged[k] = v
  }
  const q = merged.q
  const stage = merged.stage
  const tag = merged.tag
  const source = merged.source
  const payment = merged.payment // smart-list-only: subscribed / trial / lead / not_paying

  // Pull a generous page of families. Pagination can come later — for now
  // limit to 500 rows in the UI; the search box narrows the list quickly.
  let query = supabase
    .from('families')
    .select(`
      id, family_name, primary_parent, email, phone,
      source, lifecycle_stage, weekly_fee_total, stripe_customer_id,
      tags, updated_at, created_at,
      students:students!students_family_id_fkey ( id )
    `)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(500)

  if (q && q.trim()) {
    const term = q.trim()
    query = query.or(`family_name.ilike.%${term}%,primary_parent.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
  }
  if (stage && stage.trim()) query = query.eq('lifecycle_stage', stage)
  if (source && source.trim()) query = query.eq('source', source)
  if (tag && tag.trim()) query = query.contains('tags', [tag])
  if (payment === 'subscribed') query = query.gt('weekly_fee_total', 0)
  if (payment === 'not_paying') query = query.or('weekly_fee_total.eq.0,weekly_fee_total.is.null')
  // By default hide the kid-derived placeholder families from the import.
  // They're tagged 'from-roll-sheet' + 'needs-parent-link' and don't
  // represent real parent contacts. Show them only with ?show=placeholders.
  if (!showPlaceholders && !tag) {
    query = query.not('tags', 'cs', '{"from-roll-sheet"}')
  }

  const { data, error } = await query

  // Build a global tag list (top ~20) for the filter dropdown
  const tagCounts = new Map<string, number>()
  for (const f of data ?? []) {
    for (const t of f.tags ?? []) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1)
  }
  const topTags = [...tagCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([t]) => t)

  const rows: ContactRow[] = (data ?? []).map((f) => {
    const lc = f.lifecycle_stage
    const weekly = f.weekly_fee_total ?? 0
    // Payment status — same logic as the roll-call grid
    let paymentStatus: ContactRow['paymentStatus'] = 'unknown'
    if (lc === 'active' && weekly > 0) paymentStatus = 'subscribed'
    else if (lc === 'past' || lc === 'lost') paymentStatus = 'not_paying'
    else if (lc === 'trial') paymentStatus = 'trial'
    else if (lc === 'lead') paymentStatus = 'lead'
    return {
      id: f.id,
      name: f.family_name,
      primaryParent: f.primary_parent,
      email: f.email,
      phone: f.phone,
      lifecycle: f.lifecycle_stage,
      source: f.source,
      weeklyFee: f.weekly_fee_total,
      studentCount: Array.isArray(f.students) ? f.students.length : 0,
      tags: f.tags ?? [],
      paymentStatus,
      hasStripe: !!f.stripe_customer_id,
      lastActivity: f.updated_at ?? f.created_at ?? null,
    }
  })

  // Count placeholders so the banner can tell Rhett how many need linking.
  const { count: placeholderCount } = await supabase
    .from('families')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId)
    .contains('tags', ['from-roll-sheet'])

  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle={showPlaceholders ? 'Contacts · Placeholders' : 'Contacts'}
      pageSubtitle={
        showPlaceholders
          ? `${rows.length} kid-derived placeholder${rows.length === 1 ? '' : 's'} from the roll-sheet import — link each to a real parent.`
          : `${rows.length} ${rows.length === 1 ? 'contact' : 'contacts'}${q ? ` matching "${q}"` : ''}${stage ? ` · ${stage}` : ''}${tag ? ` · #${tag}` : ''}${source ? ` · source: ${source}` : ''}`
      }
      pageActions={
        <div className="flex items-center gap-2">
          {showPlaceholders ? (
            <a
              href="/contacts"
              className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
            >
              ← Back to Contacts
            </a>
          ) : (
            <a
              href="/families/import"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
            >
              📥 Import CSV
            </a>
          )}
        </div>
      }
    >
      <ContactsSubnav active="/contacts" />

      {/* Smart list tabs (saved segments) */}
      <div className="mb-4">
        <SmartListTabs
          lists={savedLists}
          activeId={activeList?.id ?? null}
          currentParams={Object.fromEntries(Object.entries(rawParams).filter(([, v]) => typeof v === 'string')) as Record<string, string>}
        />
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
        </div>
      )}

      {/* Placeholder banner — visible on the default contacts view */}
      {!showPlaceholders && (placeholderCount ?? 0) > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-amber-900">
            <strong>{placeholderCount}</strong> kid-derived placeholder contact{placeholderCount === 1 ? '' : 's'} hidden — these are students whose parent we couldn&apos;t auto-match during roll-sheet import.
          </div>
          <a
            href="/contacts?show=placeholders"
            className="text-xs font-extrabold bg-amber-200 text-amber-900 px-3 py-1.5 rounded-lg hover:bg-amber-300"
          >
            Review placeholders →
          </a>
        </div>
      )}

      <ContactsListView
        rows={rows}
        q={q ?? ''}
        stage={stage ?? ''}
        tag={tag ?? ''}
        source={source ?? ''}
        topTags={topTags}
      />
    </DashboardShell>
  )
}
