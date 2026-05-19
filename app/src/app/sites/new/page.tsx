// /sites/new — name + kind + description form. Server action creates the
// site and bootstraps a starter Home page, then redirects to the detail.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { KIND_LABEL, type SiteKind } from '@/lib/sites/blocks'
import { createSite } from '../actions'

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>
}) {
  const { err } = await searchParams
  const user = await verifySession()

  return (
    <DashboardShell
      user={user}
      currentPath="/sites"
      pageTitle="New site"
      pageSubtitle="Pick a type and we'll set up a starter page for you."
      pageActions={
        <a
          href="/sites"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Cancel
        </a>
      }
    >
      <form action={createSite} className="max-w-xl space-y-5">
        {err && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-800 text-sm px-3 py-2 rounded-r-xl">{err}</div>
        )}

        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">Name</label>
          <input
            type="text"
            name="name"
            required
            autoFocus
            placeholder="Term 2 enrolment funnel"
            className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">Type</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(Object.keys(KIND_LABEL) as SiteKind[]).map((k, i) => (
              <label key={k} className="cursor-pointer">
                <input
                  type="radio"
                  name="kind"
                  value={k}
                  defaultChecked={i === 0}
                  className="peer sr-only"
                />
                <div className="border-2 border-zinc-200 peer-checked:border-[#D72027] peer-checked:bg-red-50 rounded-2xl p-4 transition-colors">
                  <div className="font-extrabold text-sm text-zinc-900 mb-1">{KIND_LABEL[k]}</div>
                  <div className="text-[11px] text-zinc-500 leading-snug">
                    {k === 'website' && 'Multi-page brochure: home, about, classes, contact.'}
                    {k === 'funnel'  && 'Ordered steps that move a visitor towards one goal.'}
                    {k === 'landing' && 'One scrolling page — perfect for a single offer.'}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 mb-1.5">
            Description <span className="text-zinc-400 normal-case">(optional)</span>
          </label>
          <input
            type="text"
            name="description"
            placeholder="Capture trial sign-ups for Saturday acro"
            className="w-full px-3 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg"
        >
          Create site →
        </button>
      </form>
    </DashboardShell>
  )
}
