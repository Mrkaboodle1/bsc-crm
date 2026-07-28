import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { CopyButton } from '@/components/copy-button'
import { NewFormButton } from '@/components/new-form-button'
import { DeleteFormButton } from '@/components/delete-form-button'
import { ExternalLink, Pencil, BarChart3 } from 'lucide-react'

const BASE = 'https://app-chi-silk-29.vercel.app'

export default async function FormsPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: forms, error } = await supabase
    .from('forms').select('id, name, slug, fields, status').neq('status', 'archived').order('created_at', { ascending: true })
  const needsSetup = !!error && (error.message.includes('does not exist') || error.message.includes('schema cache'))

  const { data: subs } = await supabase
    .from('families').select('id, family_name, email, phone, created_at')
    .contains('tags', ['web-form']).order('created_at', { ascending: false }).limit(15)

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing/forms"
      pageTitle="Forms"
      pageSubtitle="Build forms, drop them on your website, capture leads into the CRM."
      pageActions={!needsSetup ? <NewFormButton /> : undefined}
    >
      <div className="space-y-6 max-w-4xl">
        {needsSetup ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-5 py-4 text-sm">
            <strong>One-time setup to switch on the Form Builder.</strong> Ask Jacky to finish the &ldquo;forms&rdquo; setup (a single database paste) and this page will let you build &amp; edit unlimited forms.
          </div>
        ) : (forms?.length ?? 0) === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center">
            <p className="font-semibold text-zinc-700">No forms yet.</p>
            <p className="text-sm text-zinc-500 mt-1 mb-4">Create your first form — a free-trial booking, enquiry, waiver, anything.</p>
            <NewFormButton />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-100">
                <th className="px-5 py-3">Form</th><th className="px-4 py-3">Fields</th><th className="px-4 py-3">Public link</th><th className="px-4 py-3"></th>
              </tr></thead>
              <tbody className="divide-y divide-zinc-50">
                {(forms ?? []).map((f) => {
                  const url = `${BASE}/f/${f.slug}`
                  const count = Array.isArray(f.fields) ? f.fields.filter((x: { type?: string }) => x.type !== 'heading').length : 0
                  return (
                    <tr key={f.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-3 font-semibold text-zinc-900">{f.name}</td>
                      <td className="px-4 py-3 text-zinc-500">{count} field{count === 1 ? '' : 's'}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><a href={url} target="_blank" className="text-[#D72027] hover:underline inline-flex items-center gap-1 text-xs font-semibold"><ExternalLink size={12} /> Open</a><CopyButton text={url} label="Copy" /></div></td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <a href={`/marketing/forms/${f.id}/results`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900 mr-3"><BarChart3 size={14} /> Results</a>
                        <a href={`/marketing/forms/${f.id}/edit`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-zinc-900"><Pencil size={14} /> Edit</a>
                        <DeleteFormButton id={f.id} name={f.name} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-5 py-3 bg-zinc-50 border-b border-zinc-100 text-xs font-bold uppercase tracking-wide text-zinc-500">Recent submissions ({subs?.length ?? 0})</div>
          {(subs?.length ?? 0) === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-400">No form submissions yet.</div>
          ) : (
            <ul className="divide-y divide-zinc-50">
              {(subs ?? []).map((s) => (
                <li key={s.id} className="px-5 py-3 flex items-center gap-3">
                  <a href={`/contacts/${s.id}`} className="font-medium text-sm text-zinc-800 hover:text-[#D72027] flex-1 truncate">{s.family_name}</a>
                  <span className="text-xs text-zinc-500 truncate max-w-[200px]">{s.email || s.phone || ''}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
  )
}
