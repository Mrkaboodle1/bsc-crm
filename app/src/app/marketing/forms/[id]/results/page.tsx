import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { ArrowLeft, ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Field = { id: string; type: string; label: string; options?: string[] }
type Sub = { id: string; name: string | null; created_at: string; answers: { label: string; value: string; type: string }[] }

const CHOICE = ['radio', 'dropdown', 'checkboxes', 'consent', 'rating']

export default async function FormResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await verifySession()
  const supabase = await createServerSupabase()

  const { data: form } = await supabase.from('forms').select('id, name, slug, fields').eq('id', id).maybeSingle()
  const { data: subsRaw } = await supabase.from('form_submissions').select('id, name, created_at, answers').eq('form_id', id).order('created_at', { ascending: false })
  const subs = (subsRaw ?? []) as Sub[]
  const fields = (Array.isArray(form?.fields) ? form!.fields : []) as Field[]
  const base = (user.tenant?.website && '') || 'https://app-chi-silk-29.vercel.app'
  const publicUrl = `${base}/f/${form?.slug ?? ''}`
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=10&data=${encodeURIComponent(publicUrl)}`

  // Tally choice questions.
  function optionsFor(f: Field): string[] {
    if (f.type === 'rating') return ['1', '2', '3', '4', '5']
    if (f.type === 'consent') return ['yes']
    return f.options ?? []
  }
  function tally(f: Field) {
    const counts = new Map<string, number>()
    for (const s of subs) {
      const a = s.answers?.find((x) => x.label === f.label)
      if (!a?.value) continue
      for (const v of a.value.split(',').map((x) => x.trim()).filter(Boolean)) counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    return counts
  }

  return (
    <DashboardShell user={user} currentPath="/marketing/forms" pageTitle={form ? `Results — ${form.name}` : 'Form Results'} pageSubtitle={`${subs.length} response${subs.length === 1 ? '' : 's'}`}>
      <a href="/marketing/forms" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-zinc-800 mb-4"><ArrowLeft size={15} /> Back to Forms</a>

      {!form ? <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-zinc-500">Form not found.</div> : (
        <div className="grid lg:grid-cols-[1fr_300px] gap-6 max-w-5xl">
          <div className="space-y-5">
            {subs.length === 0 && <div className="bg-white rounded-xl border border-zinc-200 p-8 text-center text-sm text-zinc-500">No responses yet — share the QR code or link to start collecting.</div>}
            {fields.filter((f) => CHOICE.includes(f.type)).map((f) => {
              const counts = tally(f)
              const opts = f.type === 'rating' || f.type === 'consent' ? optionsFor(f) : Array.from(new Set([...(f.options ?? []), ...counts.keys()]))
              const total = Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1
              return (
                <div key={f.id} className="bg-white rounded-xl border border-zinc-200 p-5">
                  <h3 className="font-bold text-zinc-900 mb-3">{f.label}</h3>
                  <div className="space-y-2">
                    {opts.map((o) => {
                      const c = counts.get(o) ?? 0
                      const pct = Math.round((c / total) * 100)
                      return (
                        <div key={o}>
                          <div className="flex justify-between text-xs text-zinc-600 mb-0.5"><span>{f.type === 'consent' ? 'Agreed' : o}</span><span className="font-semibold">{c} · {pct}%</span></div>
                          <div className="h-3 bg-zinc-100 rounded-full overflow-hidden"><div className="h-full bg-[#D72027]" style={{ width: `${pct}%` }} /></div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Text answers */}
            {fields.filter((f) => !CHOICE.includes(f.type) && f.type !== 'heading' && !['email', 'phone'].includes(f.type)).map((f) => {
              const answers = subs.map((s) => s.answers?.find((x) => x.label === f.label)?.value).filter(Boolean) as string[]
              if (answers.length === 0) return null
              return (
                <div key={f.id} className="bg-white rounded-xl border border-zinc-200 p-5">
                  <h3 className="font-bold text-zinc-900 mb-2">{f.label} <span className="text-xs font-normal text-zinc-400">({answers.length})</span></h3>
                  <ul className="space-y-1.5 max-h-64 overflow-y-auto">{answers.slice(0, 50).map((a, i) => <li key={i} className="text-sm text-zinc-700 bg-zinc-50 rounded-lg px-3 py-2">{a}</li>)}</ul>
                </div>
              )
            })}
          </div>

          {/* Share / QR */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 p-5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Scan to fill in</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code" className="w-44 h-44 mx-auto rounded-lg border border-zinc-100" />
              <a href={publicUrl} target="_blank" className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-[#D72027] hover:underline"><ExternalLink size={12} /> Open the form</a>
              <p className="text-[11px] text-zinc-400 mt-2 break-all">{publicUrl}</p>
              <a href={qr} download={`${form.slug}-qr.png`} target="_blank" className="mt-3 inline-block w-full bg-zinc-900 text-white text-sm font-semibold py-2 rounded-lg">Download QR</a>
            </div>
            <div className="bg-white rounded-xl border border-zinc-200 p-5">
              <div className="text-3xl font-extrabold text-zinc-900">{subs.length}</div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Total responses</div>
            </div>
          </div>
        </div>
      )}
    </DashboardShell>
  )
}
