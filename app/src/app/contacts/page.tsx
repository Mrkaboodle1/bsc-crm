// /contacts — same underlying `families` table, Tectonic-style list view.
// Adds: tag pills column, attribution source column, last-activity timestamp,
// payment status pill. URL params: ?q= search · ?stage= lifecycle filter
// · ?tag= tag filter · ?source= attribution source.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContactsListView, type ContactRow } from './contacts-list-view'

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; tag?: string; source?: string }>
}) {
  const { q, stage, tag, source } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

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

  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle="Contacts"
      pageSubtitle={`${rows.length} ${rows.length === 1 ? 'contact' : 'contacts'}${q ? ` matching "${q}"` : ''}${stage ? ` · ${stage}` : ''}${tag ? ` · #${tag}` : ''}${source ? ` · source: ${source}` : ''}`}
      pageActions={
        <a
          href="/families/import"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
        >
          📥 Import CSV
        </a>
      }
    >
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm mb-4">
          {error.message}
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
