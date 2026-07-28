// Companies list table — Tectonic-style row layout.

import { RowActions } from '@/components/row-actions'
import { deleteCompany } from './actions'

export type CompanyRow = {
  id: string
  name: string
  category: string | null
  categoryLabel: string | null
  email: string | null
  phone: string | null
  website: string | null
  location: string | null
  description: string | null
}

export function CompaniesList({
  rows,
  q,
  category,
  categoryLabels,
}: {
  rows: CompanyRow[]
  q: string
  category: string
  categoryLabels: Record<string, string>
}) {
  return (
    <div className="space-y-4">
      <form className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search company / email / phone…"
          className="flex-1 min-w-[180px] px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
        />
        <select
          name="category"
          defaultValue={category}
          className="px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
        >
          <option value="">Any category</option>
          {Object.entries(categoryLabels).map(([k, label]) => (
            <option key={k} value={k}>{label}</option>
          ))}
        </select>
        <button type="submit" className="bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800">
          Filter
        </button>
        {(q || category) && (
          <a href="/contacts/companies" className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-3 py-2.5">
            Clear
          </a>
        )}
      </form>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center">
          <div className="text-5xl mb-3">🏢</div>
          <p className="font-bold text-zinc-700">No companies yet.</p>
          <p className="text-sm text-zinc-500 mt-1">Add schools, NDIS providers, suppliers, partner venues.</p>
          <a
            href="/contacts/companies/new"
            className="inline-flex items-center gap-2 mt-4 bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-4 py-2.5 rounded-lg shadow-md hover:shadow-lg"
          >
            + Add company
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200">
              <tr className="text-left text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
                <th className="px-4 sm:px-5 py-3">Company</th>
                <th className="px-4 py-3 hidden md:table-cell">Category</th>
                <th className="px-4 py-3 hidden lg:table-cell">Contact</th>
                <th className="px-4 py-3 hidden md:table-cell">Location</th>
                <th className="px-2 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 sm:px-5 py-3">
                    <a href={`/contacts/companies/${c.id}`} className="flex items-center gap-3 group">
                      <span className="w-9 h-9 rounded-lg bg-gradient-to-br from-zinc-700 to-zinc-900 text-white flex items-center justify-center text-xs font-extrabold shrink-0">
                        {c.name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="font-extrabold text-zinc-900 group-hover:underline truncate">{c.name}</div>
                        {c.description && <div className="text-[11px] text-zinc-500 truncate max-w-[280px]">{c.description}</div>}
                      </div>
                    </a>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-zinc-600">
                    {c.categoryLabel ?? '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-zinc-600">
                    {c.email && <div className="truncate max-w-[200px]">{c.email}</div>}
                    {c.phone && <div className="text-zinc-400">{c.phone}</div>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-zinc-500">
                    {c.location ?? '—'}
                  </td>
                  <td className="px-2 py-3 text-right">
                    <RowActions
                      editHref={`/contacts/companies/${c.id}`}
                      deleteAction={deleteCompany.bind(null, { id: c.id })}
                      confirmText={`Delete ${c.name}? This cannot be undone.`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
