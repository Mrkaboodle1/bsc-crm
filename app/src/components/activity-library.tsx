'use client'

import { useState, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import type { Activity } from '@/lib/workshop-activities'
import { Plus, X, Pencil, Trash2, Play, ExternalLink, Upload, ImageIcon } from 'lucide-react'

// ── YouTube helpers ──
function youtubeId(url: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}
const ytThumb = (id: string) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`
function thumbFor(a: Activity): string | null {
  if (a.image_url) return a.image_url
  const yt = youtubeId(a.video_url)
  return yt ? ytThumb(yt) : null
}

// ── Upload a file straight to the public workshop-media bucket ──
async function uploadFile(file: File): Promise<string> {
  const supabase = createBrowserSupabase()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `activities/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('workshop-media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from('workshop-media').getPublicUrl(path).data.publicUrl
}

export function ActivityLibrary({ initial }: { initial: Activity[] }) {
  const [items, setItems] = useState<Activity[]>(initial)
  const [editing, setEditing] = useState<Activity | null>(null)
  const [adding, setAdding] = useState(false)
  const [watch, setWatch] = useState<Activity | null>(null)

  async function remove(a: Activity) {
    if (!confirm(`Delete “${a.title}”? This removes it from the activity library.`)) return
    setItems((xs) => xs.filter((x) => x.id !== a.id))
    await fetch(`/api/workshops/activities?id=${a.id}`, { method: 'DELETE' }).catch(() => {})
  }
  function onSaved(saved: Activity, isNew: boolean) {
    setItems((xs) => isNew ? [...xs, saved] : xs.map((x) => x.id === saved.id ? saved : x))
    setAdding(false); setEditing(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <p className="text-sm text-zinc-500">Every activity has a photo and a demo video. Tap a card to watch, or edit it — coaches can add their own.</p>
        <button onClick={() => setAdding(true)} className="inline-flex items-center gap-2 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-[#A0151B]"><Plus size={16} /> Add activity</button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">No activities yet — tap “Add activity” to create your first one.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((a) => {
            const img = thumbFor(a)
            const hasVideo = !!youtubeId(a.video_url) || !!a.video_url
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col">
                <button onClick={() => hasVideo ? setWatch(a) : (a.source_url && window.open(a.source_url, '_blank'))} className="relative block aspect-video w-full bg-gradient-to-br from-[#D72027] to-amber-500 group">
                  {img
                    ? <img src={img} alt={a.title} className="absolute inset-0 w-full h-full object-cover" />
                    : <span className="absolute inset-0 flex items-center justify-center text-6xl">{a.icon || '🎪'}</span>}
                  {hasVideo && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors">
                      <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/90 shadow-lg"><Play size={20} className="text-[#D72027] ml-0.5" /></span>
                    </span>
                  )}
                  {!hasVideo && a.source_url && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 bg-white/90 text-zinc-700 text-[10px] font-bold px-2 py-1 rounded-full shadow"><ExternalLink size={11} /> Instructions</span>
                  )}
                </button>
                <div className="p-3 flex-1 flex flex-col">
                  <div className="font-extrabold text-zinc-900 flex items-center gap-1.5"><span>{a.icon || '🎪'}</span> {a.title}</div>
                  {a.description && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{a.description}</p>}
                  <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-zinc-100 flex-wrap">
                    {hasVideo && <button onClick={() => setWatch(a)} className="inline-flex items-center gap-1 text-xs font-bold text-[#D72027] bg-red-50 px-2.5 py-1.5 rounded-lg"><Play size={12} /> Watch</button>}
                    {a.source_url && <a href={a.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-zinc-600 bg-zinc-100 px-2.5 py-1.5 rounded-lg"><ExternalLink size={12} /> Tutorial</a>}
                    <button onClick={() => setEditing(a)} className="ml-auto p-1.5 text-zinc-400 hover:text-[#D72027]" title="Edit"><Pencil size={15} /></button>
                    <button onClick={() => remove(a)} className="p-1.5 text-zinc-400 hover:text-red-600" title="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(adding || editing) && <ActivityModal existing={editing} onClose={() => { setAdding(false); setEditing(null) }} onSaved={onSaved} />}
      {watch && <WatchModal activity={watch} onClose={() => setWatch(null)} />}
    </div>
  )
}

function WatchModal({ activity, onClose }: { activity: Activity; onClose: () => void }) {
  const yt = youtubeId(activity.video_url)
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-black rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 text-white"><span className="font-bold text-sm">{activity.icon} {activity.title}</span><button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={20} /></button></div>
        <div className="aspect-video w-full bg-black">
          {yt
            ? <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${yt}?autoplay=1`} title={activity.title} allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
            : activity.video_url
              ? <video className="w-full h-full" src={activity.video_url} controls autoPlay />
              : <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm">No video added yet.</div>}
        </div>
      </div>
    </div>
  )
}

const input = 'w-full px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'

function ActivityModal({ existing, onClose, onSaved }: { existing: Activity | null; onClose: () => void; onSaved: (a: Activity, isNew: boolean) => void }) {
  const isEdit = !!existing
  const [f, setF] = useState({
    title: existing?.title ?? '', description: existing?.description ?? '', icon: existing?.icon ?? '🎪',
    image_url: existing?.image_url ?? '', video_url: existing?.video_url ?? '', source_url: existing?.source_url ?? '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [uploading, setUploading] = useState<'image' | 'video' | null>(null)
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }))

  async function pickFile(kind: 'image' | 'video', file: File | undefined) {
    if (!file) return
    setUploading(kind); setErr('')
    try { const url = await uploadFile(file); set(kind === 'image' ? 'image_url' : 'video_url', url) }
    catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed') }
    finally { setUploading(null) }
  }

  async function save() {
    if (!f.title.trim()) { setErr('Give the activity a name'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch('/api/workshops/activities', {
        method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? { id: existing!.id, ...f } : f),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Could not save')
      const saved: Activity = {
        id: isEdit ? existing!.id : j.id, title: f.title.trim(), description: f.description || null, icon: f.icon || '🎪',
        image_url: f.image_url || null, video_url: f.video_url || null, source_url: f.source_url || null, sort_order: existing?.sort_order ?? 999,
      }
      onSaved(saved, !isEdit)
    } catch (e) { setErr(e instanceof Error ? e.message : 'Error'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900 text-lg">{isEdit ? 'Edit activity' : 'Add activity'}</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-4">
          <div className="flex gap-3">
            <label className="block w-20 shrink-0"><span className="block text-xs font-semibold text-zinc-600 mb-1">Icon</span><input className={input + ' text-center text-xl'} value={f.icon} onChange={(e) => set('icon', e.target.value)} maxLength={2} /></label>
            <label className="block flex-1"><span className="block text-xs font-semibold text-zinc-600 mb-1">Activity name</span><input className={input} value={f.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Hula hoop making" autoFocus /></label>
          </div>
          <label className="block"><span className="block text-xs font-semibold text-zinc-600 mb-1">Description (optional)</span><textarea className={input} rows={2} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What the kids make / do" /></label>

          {/* Image */}
          <div>
            <span className="block text-xs font-semibold text-zinc-600 mb-1">Photo</span>
            <div className="flex items-center gap-3">
              <div className="w-20 h-20 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                {f.image_url ? <img src={f.image_url} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={22} className="text-zinc-300" />}
              </div>
              <div className="flex-1 space-y-2">
                <button onClick={() => imgRef.current?.click()} disabled={uploading === 'image'} className="inline-flex items-center gap-2 bg-zinc-900 text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"><Upload size={14} /> {uploading === 'image' ? 'Uploading…' : 'Upload a photo'}</button>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile('image', e.target.files?.[0])} />
                <input className={input} value={f.image_url} onChange={(e) => set('image_url', e.target.value)} placeholder="…or paste an image link" />
              </div>
            </div>
          </div>

          {/* Video */}
          <div>
            <span className="block text-xs font-semibold text-zinc-600 mb-1">Demo video</span>
            <input className={input} value={f.video_url} onChange={(e) => set('video_url', e.target.value)} placeholder="Paste a YouTube link (recommended)" />
            <div className="flex items-center gap-2 mt-2">
              <button onClick={() => vidRef.current?.click()} disabled={uploading === 'video'} className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"><Upload size={14} /> {uploading === 'video' ? 'Uploading…' : 'Or upload a short video'}</button>
              <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={(e) => pickFile('video', e.target.files?.[0])} />
              {f.video_url && <span className="text-[11px] text-emerald-600 font-semibold">✓ video added</span>}
            </div>
          </div>

          <label className="block"><span className="block text-xs font-semibold text-zinc-600 mb-1">Tutorial / instructions link (optional)</span><input className={input} value={f.source_url} onChange={(e) => set('source_url', e.target.value)} placeholder="A how-to page coaches can open" /></label>

          {err && <p className="text-sm text-red-600">{err}</p>}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-zinc-100">
            <button onClick={onClose} className="text-sm font-semibold text-zinc-500 px-3 py-2.5">Cancel</button>
            <button onClick={save} disabled={busy} className="bg-[#D72027] text-white font-extrabold text-sm px-6 py-3 rounded-xl disabled:opacity-50">{busy ? 'Saving…' : isEdit ? 'Save changes' : 'Add activity'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
