'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { Star, ExternalLink, FileText, Trophy, BookOpen, Sparkles, Printer, Plus, Trash2, Pencil, X, type LucideIcon } from 'lucide-react'
import { SECTION_META, type RewardDesign } from '@/lib/reward-designs'

const SECTION_ICON: Record<string, LucideIcon> = { 'skill-cards': Trophy, 'progress-cards': Sparkles, 'books': BookOpen, 'other': FileText }
const inputCls = 'w-full px-3 py-2 border border-zinc-200 rounded-lg text-sm focus:border-zinc-900 focus:outline-none'

export function RewardDesignsClient({ designs, canManage }: { designs: RewardDesign[]; canManage: boolean }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<RewardDesign | null>(null)
  const [busy, setBusy] = useState(false)

  const totalDesigns = designs.length
  const totalPages = designs.reduce((n, d) => n + (d.pages || 0), 0)
  const sections = SECTION_META.map((m) => ({ ...m, items: designs.filter((d) => d.section === m.id) })).filter((s) => s.items.length > 0 || canManage)

  async function del(d: RewardDesign) {
    if (!window.confirm(`Remove “${d.title}” from the library?`)) return
    setBusy(true)
    try { await fetch('/api/reward-designs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete', id: d.id }) }); router.refresh() } finally { setBusy(false) }
  }

  return (
    <>
      {/* Summary banner */}
      <div className="bg-zinc-950 text-white rounded-xl p-5 mb-6 border border-zinc-800 flex items-center gap-5 flex-wrap">
        <div className="w-12 h-12 rounded-lg bg-[#FFC107] flex items-center justify-center shrink-0"><Star size={22} className="text-zinc-900 fill-zinc-900" /></div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold tracking-tight">Star Reward Library</h2>
          <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">Print masters for every Star Reward card. Click a tile to open the original in Canva — edit and print from there.</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          <span className="inline-flex items-center gap-1.5"><FileText size={12} /> {totalDesigns} designs</span>
          <span className="text-zinc-700">·</span>
          <span className="inline-flex items-center gap-1.5"><BookOpen size={12} /> {totalPages} pages</span>
        </div>
      </div>

      {canManage && (
        <div className="flex justify-end mb-4">
          <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-4 py-2 rounded-lg"><Plus size={15} /> Add design</button>
        </div>
      )}

      <div className="space-y-10">
        {sections.map((s) => {
          const Icon = SECTION_ICON[s.id] || FileText
          return (
            <section key={s.id}>
              <div className="flex items-baseline justify-between gap-3 mb-3 pb-2 border-b border-zinc-200">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-md bg-zinc-100 text-zinc-700 flex items-center justify-center shrink-0"><Icon size={16} /></span>
                  <div><h2 className="text-base font-bold text-zinc-900">{s.title}</h2><p className="text-xs text-zinc-500 leading-snug mt-0.5">{s.description}</p></div>
                </div>
                <span className="hidden sm:inline-flex shrink-0 items-center text-[10px] font-semibold uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full">{s.items.length} {s.items.length === 1 ? 'design' : 'designs'}</span>
              </div>
              {s.items.length === 0 ? (
                <p className="text-sm text-zinc-400 italic px-1">No designs here yet — use “Add design”.</p>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {s.items.map((d) => <DesignRow key={d.id} design={d} Icon={SECTION_ICON[d.section] || FileText} canManage={canManage} onDelete={() => del(d)} onEdit={() => setEditing(d)} busy={busy} />)}
                </div>
              )}
            </section>
          )
        })}
      </div>

      {adding && createPortal(<DesignModal onClose={() => setAdding(false)} onSaved={() => { setAdding(false); router.refresh() }} setBusy={setBusy} busy={busy} />, document.body)}
      {editing && createPortal(<DesignModal existing={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh() }} setBusy={setBusy} busy={busy} />, document.body)}
    </>
  )
}

function DesignRow({ design: d, Icon, canManage, onDelete, onEdit, busy }: { design: RewardDesign; Icon: LucideIcon; canManage: boolean; onDelete: () => void; onEdit: () => void; busy: boolean }) {
  const pdfHref = d.pdf ? `/star-rewards/${d.pdf}.pdf` : d.pdfUrl
  return (
    <div className="group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-zinc-300 hover:shadow-sm transition-all">
      <div className="flex items-start gap-4">
        <span className="w-9 h-9 rounded-md bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0 ring-1 ring-inset ring-amber-100"><Icon size={16} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">{d.pages ? `${d.pages} ${d.pages === 1 ? 'page' : 'pages'} · ` : ''}Canva</div>
            {canManage && (
              <div className="flex items-center gap-1 -mt-1">
                <button onClick={onEdit} disabled={busy} title="Edit design" className="text-zinc-300 hover:text-[#D72027]"><Pencil size={14} /></button>
                <button onClick={onDelete} disabled={busy} title="Remove design" className="text-zinc-300 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
          <div className="text-sm font-semibold text-zinc-900 leading-tight">{d.title}</div>
          {d.desc && <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-snug">{d.desc}</p>}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            {d.viewUrl && <a href={d.viewUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white px-3 py-1.5 rounded-md"><ExternalLink size={12} /> Open in Canva</a>}
            {d.pdf && <a href={`/star-rewards/print.html?file=${d.pdf}.pdf&title=${encodeURIComponent(d.title)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-[#D72027] hover:bg-[#A0151B] text-white px-3 py-1.5 rounded-md"><Printer size={12} /> Print</a>}
            {pdfHref && <a href={pdfHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md"><FileText size={12} /> PDF</a>}
          </div>
        </div>
      </div>
    </div>
  )
}

function DesignModal({ existing, onClose, onSaved, setBusy, busy }: { existing?: RewardDesign; onClose: () => void; onSaved: () => void; setBusy: (b: boolean) => void; busy: boolean }) {
  const isEdit = !!existing
  const [f, setF] = useState({
    title: existing?.title ?? '',
    section: existing?.section ?? 'skill-cards',
    desc: existing?.desc ?? '',
    viewUrl: existing?.viewUrl ?? '',
    pdfUrl: existing?.pdfUrl ?? '',
    pages: existing?.pages ? String(existing.pages) : '',
  })
  const [err, setErr] = useState('')
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))
  async function save() {
    if (!f.title.trim()) { setErr('Give it a title'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/reward-designs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: isEdit ? 'update' : 'add', id: existing?.id, ...f }) })
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(j.error || 'Could not save') }
      onSaved()
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900">{isEdit ? 'Edit Star Reward design' : 'Add a Star Reward design'}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-4">
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Title *</span><input className={inputCls} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Trampoline Skill Card" /></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Section</span>
            <select className={inputCls} value={f.section} onChange={(e) => set('section', e.target.value)}>{SECTION_META.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
          </label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Description</span><input className={inputCls} value={f.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Short description" /></label>
          <label className="block"><span className="text-xs font-semibold text-zinc-600">Canva link</span><input className={inputCls} value={f.viewUrl} onChange={(e) => set('viewUrl', e.target.value)} placeholder="https://www.canva.com/d/…" /></label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block"><span className="text-xs font-semibold text-zinc-600">PDF link (optional)</span><input className={inputCls} value={f.pdfUrl} onChange={(e) => set('pdfUrl', e.target.value)} placeholder="https://…" /></label>
            <label className="block"><span className="text-xs font-semibold text-zinc-600">Pages</span><input type="number" className={inputCls} value={f.pages} onChange={(e) => set('pages', e.target.value)} /></label>
          </div>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg disabled:opacity-50">{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add design'}</button>
            <button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-4">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  )
}
