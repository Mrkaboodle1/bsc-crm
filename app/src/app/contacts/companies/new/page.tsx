// Add Company form. Server action creates the row + redirects to detail.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { ContactsSubnav } from '@/components/contacts-subnav'
import { createCompany } from '../actions'

export default async function NewCompanyPage() {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath="/contacts"
      pageTitle="Add company"
      pageSubtitle="School, NDIS plan-manager, supplier, venue, partner — anything B2B."
      pageActions={
        <a
          href="/contacts/companies"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Cancel
        </a>
      }
    >
      <ContactsSubnav active="/contacts/companies" />

      <form action={createCompany} className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5 max-w-2xl space-y-4">
        <Field label="Name *" name="name" required />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SelectField label="Category" name="category" options={[
            { v: 'school',         l: '🏫 School' },
            { v: 'ndis_provider',  l: '💜 NDIS provider' },
            { v: 'supplier',       l: '📦 Supplier' },
            { v: 'partner',        l: '🤝 Partner' },
            { v: 'venue',          l: '🎪 Venue' },
            { v: 'other',          l: '✨ Other' },
          ]} />
          <Field label="Website" name="website" placeholder="https://" type="url" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email" name="email" type="email" />
          <Field label="Phone" name="phone" type="tel" />
        </div>
        <Field label="Address" name="address" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="City" name="city" />
          <Field label="State" name="state" placeholder="QLD" />
          <Field label="Postcode" name="postal_code" />
        </div>
        <FieldArea label="Description" name="description" rows={2} placeholder="What this company does, why we work with them" />
        <FieldArea label="Notes" name="notes" rows={3} placeholder="Internal notes (e.g. contact's name, billing arrangement)" />

        <div className="flex justify-end gap-2 pt-3 border-t border-zinc-200">
          <a href="/contacts/companies" className="text-sm font-bold text-zinc-600 px-3 py-2 rounded-lg hover:bg-zinc-100">Cancel</a>
          <button type="submit" className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-2.5 rounded-xl shadow-md hover:shadow-lg">
            + Create company
          </button>
        </div>
      </form>
    </DashboardShell>
  )
}

function Field({ label, name, required, placeholder, type = 'text' }: { label: string; name: string; required?: boolean; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">{label}</span>
      <input
        name={name}
        required={required}
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
      />
    </label>
  )
}

function FieldArea({ label, name, rows, placeholder }: { label: string; name: string; rows: number; placeholder?: string }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">{label}</span>
      <textarea name={name} rows={rows} placeholder={placeholder} className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none" />
    </label>
  )
}

function SelectField({ label, name, options }: { label: string; name: string; options: Array<{ v: string; l: string }> }) {
  return (
    <label className="block">
      <span className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1">{label}</span>
      <select name={name} className="w-full px-3 py-2 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none">
        <option value="">— pick one —</option>
        {options.map((o) => (
          <option key={o.v} value={o.v}>{o.l}</option>
        ))}
      </select>
    </label>
  )
}
