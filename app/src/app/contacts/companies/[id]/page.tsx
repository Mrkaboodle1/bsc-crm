import { notFound } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContactsSubnav } from '@/components/contacts-subnav'

const CATEGORY_LABEL: Record<string, string> = {
  school: '🏫 School',
  ndis_provider: '💜 NDIS provider',
  supplier: '📦 Supplier',
  partner: '🤝 Partner',
  venue: '🎪 Venue',
  other: '✨ Other',
}

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: company, error } = await supabase
    .from('companies')
    .select('id, name, category, email, phone, website, address, city, state, postal_code, country, description, notes, tags, created_at')
    .eq('id', id)
    .eq('tenant_id', user.tenantId)
    .maybeSingle()
  if (error || !company) notFound()

  // Linked families (NDIS plan-managed families etc.)
  const { data: linked } = await supabase
    .from('families')
    .select('id, family_name, primary_parent, email, lifecycle_stage')
    .eq('company_id', id)
    .limit(50)

  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle={company.name}
      pageSubtitle={company.category ? CATEGORY_LABEL[company.category] ?? company.category : 'Company'}
      pageActions={
        <a href="/contacts/companies" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50">
          ← All companies
        </a>
      }
    >
      <ContactsSubnav active="/contacts/companies" />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-3">Details</div>
            <dl className="space-y-2 text-sm">
              <Row label="Email" value={company.email} link={company.email ? `mailto:${company.email}` : null} />
              <Row label="Phone" value={company.phone} link={company.phone ? `tel:${company.phone}` : null} />
              <Row label="Website" value={company.website} link={company.website} external />
              <Row label="Address" value={[company.address, company.city, company.state, company.postal_code, company.country].filter(Boolean).join(', ') || '—'} />
            </dl>
            {company.description && (
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">Description</div>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap">{company.description}</p>
              </div>
            )}
            {company.notes && (
              <div className="mt-4 border-t border-zinc-100 pt-3">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">Notes</div>
                <p className="text-sm text-zinc-700 whitespace-pre-wrap">{company.notes}</p>
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-5">
            <div className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
              Linked contacts ({linked?.length ?? 0})
            </div>
            {!linked || linked.length === 0 ? (
              <p className="text-xs text-zinc-500">No contacts linked yet. Set <code className="bg-zinc-100 px-1 rounded">company_id</code> on a family to link them.</p>
            ) : (
              <ul className="space-y-1.5">
                {linked.map((f) => (
                  <li key={f.id}>
                    <a href={`/contacts/${f.id}`} className="text-sm font-bold text-zinc-700 hover:text-[#D72027] hover:underline truncate block">
                      {f.primary_parent ?? f.family_name}
                    </a>
                    <div className="text-[10px] text-zinc-400 truncate">{f.email ?? '—'} · {f.lifecycle_stage ?? '—'}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </DashboardShell>
  )
}

function Row({ label, value, link, external }: { label: string; value: string | null; link?: string | null; external?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-900 text-right text-sm font-bold truncate">
        {value
          ? link
            ? <a href={link} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined} className="hover:underline">{value}{external ? ' ↗' : ''}</a>
            : value
          : '—'}
      </dd>
    </div>
  )
}
