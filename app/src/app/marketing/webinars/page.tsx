import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CopyButton } from '@/components/copy-button'
import { ExternalLink, Video } from 'lucide-react'

const BASE = 'https://app-chi-silk-29.vercel.app'
// Upcoming online sessions. Edit here to add a webinar (ask Jacky).
const WEBINARS = [
  { title: 'New Parent Info Night', when: 'First Tuesday each month · 7:00pm', blurb: 'Everything new families need to know about Big Star classes.' },
  { title: 'Holiday Programme Preview', when: 'Week before each school holidays · 7:00pm', blurb: 'What’s on these holidays + how to book.' },
]

export default async function WebinarsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: regos } = await supabase
    .from('families').select('id, family_name, email, phone, created_at')
    .contains('tags', ['webinar']).order('created_at', { ascending: false }).limit(20)
  const url = `${BASE}/f/webinar`

  return (
    <DashboardShell user={user} currentPath="/marketing/webinars" pageTitle="Webinars" pageSubtitle="Run online info nights & events — registrations become contacts.">
      <div className="space-y-6 max-w-4xl">
        <div className="grid md:grid-cols-2 gap-4">
          {WEBINARS.map((w) => (
            <div key={w.title} className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="flex items-center gap-2 text-[#D72027] mb-1"><Video size={16} /><h3 className="font-semibold text-zinc-900">{w.title}</h3></div>
              <div className="text-xs font-semibold text-zinc-500">{w.when}</div>
              <p className="text-sm text-zinc-500 mt-2 mb-4">{w.blurb}</p>
              <div className="flex flex-wrap gap-1.5">
                <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#D72027] hover:bg-[#A0151B] rounded-md px-2.5 py-1.5"><ExternalLink size={13} /> Registration page</a>
                <CopyButton text={url} label="Copy link" />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-500">Registrations ({regos?.length ?? 0})</div>
          {(regos?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No registrations yet — share the registration link to fill your next session.</div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {(regos ?? []).map((r) => (
                <li key={r.id} className="px-5 py-3 flex items-center gap-3">
                  <a href={`/contacts/${r.id}`} className="font-medium text-sm text-zinc-800 hover:text-[#D72027] flex-1 truncate">{r.family_name}</a>
                  <span className="text-xs text-zinc-500 truncate max-w-[200px]">{r.email || r.phone || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="text-[11px] text-zinc-400">Tip: run the session on Zoom/Meet and email the link to your registrations (they&apos;re all here as contacts). Built-in video can come later.</p>
      </div>
    </DashboardShell>
  )
}
