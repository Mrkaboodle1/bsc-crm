// /contacts/companies — Tectonic-style B2B list. Schools, NDIS plan-managers,
// suppliers, partner venues, etc. Each row links to a detail page.

import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContactsSubnav } from '@/components/contacts-subnav'
import { CompaniesList, type CompanyRow } from './companies-list'

const CATEGORY_LABEL: Record<string, string> = {
  school: '🏫 School',
  ndis_provider: '💜 NDIS provider',
  supplier: '📦 Supplier',
  partner: '🤝 Partner',
  venue: '🎪 Venue',
  other: '✨ Other',
}

export default async function CompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>
}) {
  const { q, category } = await searchParams
  const user = await verifySession()
  const supabase = await createServerSupabase()

  let query = supabase
    .from('companies')
    .select('id, name, category, email, phone, website, address, city, state, description, created_at')
    .eq('tenant_id', user.tenantId)
    .order('name', { ascending: true })
    .limit(500)

  if (q && q.trim()) {
    const term = q.trim()
    query = query.or(`name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
  }
  if (category && category.trim()) query = query.eq('category', category)

  const { data, error } = await query

  // Migration 008 might not be applied yet — handle gracefully
  const tableMissing = error?.message?.includes('does not exist') || error?.message?.includes('relation')

  const rows: CompanyRow[] = (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    categoryLabel: c.category ? (CATEGORY_LABEL[c.category] ?? c.category) : null,
    email: c.email,
    phone: c.phone,
    website: c.website,
    location: [c.city, c.state].filter(Boolean).join(', ') || null,
    description: c.description,
  }))

  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle="Companies"
      pageSubtitle={`${rows.length} ${rows.length === 1 ? 'company' : 'companies'} — schools, NDIS providers, suppliers, partners`}
      pageActions={
        <a
          href="/contacts/companies/new"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
        >
          + Add company
        </a>
      }
    >
      <ContactsSubnav active="/contacts/companies" />

      {tableMissing && (
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-4 py-3 mb-4 text-sm text-amber-900">
          <strong>Companies table missing.</strong> Apply <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">schema/008_smartlists_tasks_companies.sql</code> in Supabase SQL editor to enable this page.
        </div>
      )}

      <CompaniesList rows={rows} q={q ?? ''} category={category ?? ''} categoryLabels={CATEGORY_LABEL} />
    </DashboardShell>
  )
}
