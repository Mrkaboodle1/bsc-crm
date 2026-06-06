import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CopyButton } from '@/components/copy-button'
import { ExternalLink } from 'lucide-react'

const BASE = 'https://app-chi-silk-29.vercel.app'
const FORMS = [
  { slug: 'trial', name: 'Free Trial booking', desc: 'Parents book a free trial class.' },
  { slug: 'enquiry', name: 'General enquiry', desc: 'A catch-all contact form.' },
  { slug: 'party', name: 'Birthday party enquiry', desc: 'Circus party bookings.' },
]

function rel(iso: string | null) {
  if (!iso) return ''
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (d <= 0) return 'today'; if (d === 1) return 'yesterday'; if (d < 30) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
}

export default async function FormsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data: subs } = await supabase
    .from('families')
    .select('id, family_name, email, phone, created_at')
    .contains('tags', ['web-form'])
    .order('created_at', { ascending: false })
    .limit(15)
  const submissions = subs ?? []

  return (
    <DashboardShell user={user} currentPath="/marketing/forms" pageTitle="Forms" pageSubtitle="Shareable forms that turn visitors into contacts automatically.">
      <div className="space-y-6 max-w-4xl">
        <div className="grid md:grid-cols-3 gap-4">
          {FORMS.map((f) => {
            const url = `${BASE}/f/${f.slug}`
            const embed = `<iframe src="${url}" width="100%" height="640" style="border:0;border-radius:16px"></iframe>`
            return (
              <div key={f.slug} className="bg-white rounded-xl border border-zinc-200 p-5 flex flex-col">
                <h3 className="font-semibold text-zinc-900">{f.name}</h3>
                <p className="text-xs text-zinc-500 mt-1 mb-4 flex-1">{f.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  <a href={url} target="_blank" className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#D72027] hover:bg-[#A0151B] rounded-md px-2.5 py-1.5"><ExternalLink size={13} /> Open</a>
                  <CopyButton text={url} label="Copy link" />
                  <CopyButton text={embed} label="Embed code" />
                </div>
              </div>
            )
          })}
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">Recent submissions</span>
            <span className="text-xs text-zinc-400">{submissions.length} shown</span>
          </div>
          {submissions.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No form submissions yet. Share a form link above to start capturing leads.</div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {submissions.map((s) => (
                <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold shrink-0">{(s.family_name ?? '?').slice(0, 1).toUpperCase()}</span>
                  <a href={`/contacts/${s.id}`} className="font-medium text-sm text-zinc-800 hover:text-[#D72027] flex-1 truncate">{s.family_name}</a>
                  <span className="text-xs text-zinc-500 hidden sm:block truncate max-w-[180px]">{s.email || s.phone || ''}</span>
                  <span className="text-[11px] text-zinc-400">{rel(s.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
