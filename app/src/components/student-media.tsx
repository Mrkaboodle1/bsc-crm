'use client'

import { useState, useRef, useEffect } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { Camera, Upload, X, Trash2, Send, Play, Pencil } from 'lucide-react'

type Media = { id: string; url: string; kind: 'photo' | 'video'; caption: string | null; created_at: string }

async function uploadToBucket(file: File): Promise<{ url: string; kind: 'photo' | 'video' }> {
  const supabase = createBrowserSupabase()
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `students/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('workshop-media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw new Error(error.message)
  const url = supabase.storage.from('workshop-media').getPublicUrl(path).data.publicUrl
  return { url, kind: file.type.startsWith('video') ? 'video' : 'photo' }
}

export function StudentMedia({ studentId }: { studentId: string }) {
  const [items, setItems] = useState<Media[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [view, setView] = useState<Media | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const camRef = useRef<HTMLInputElement | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    let on = true
    setLoading(true)
    fetch(`/api/student-media?student_id=${studentId}`).then((r) => r.json()).then((j) => { if (on) { setItems(j.ok ? j.rows : []); setLoading(false) } }).catch(() => on && setLoading(false))
    return () => { on = false }
  }, [studentId])

  async function add(file?: File | null) {
    if (!file) return
    setUploading(true)
    try {
      const { url, kind } = await uploadToBucket(file)
      const name = window.prompt(`Name this ${kind} (so you can find it later) — e.g. "Aidan swing & spin"`) || ''
      const r = await fetch('/api/student-media', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ student_id: studentId, url, kind, caption: name.trim() || null }) })
      const j = await r.json()
      if (j.ok && j.row) setItems((xs) => [j.row, ...xs]); else alert(j.error || 'Could not save')
    } catch (e) { alert(e instanceof Error ? e.message : 'Upload failed') } finally { setUploading(false) }
  }
  async function rename(m: Media) {
    const name = window.prompt('Name this clip', m.caption || '')
    if (name === null) return
    setItems((xs) => xs.map((x) => x.id === m.id ? { ...x, caption: name.trim() || null } : x))
    if (view?.id === m.id) setView({ ...m, caption: name.trim() || null })
    fetch('/api/student-media', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: m.id, caption: name.trim() }) }).catch(() => {})
  }
  async function del(id: string) {
    if (!confirm('Delete this clip/photo?')) return
    setItems((xs) => xs.filter((x) => x.id !== id)); setView(null)
    fetch(`/api/student-media?id=${id}`, { method: 'DELETE' }).catch(() => {})
  }
  async function emailParent(id: string) {
    setSending(id)
    const r = await fetch('/api/student-media/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const j = await r.json(); setSending(null)
    alert(j.ok ? `Sent to ${j.to} by ${j.via === 'sms' ? 'text' : 'email'} ✓` : (j.error || 'Could not send'))
  }

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-zinc-500">📷 Photos & videos</div>
        <div className="flex items-center gap-2">
          <button onClick={() => camRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"><Camera size={14} /> {uploading ? 'Saving…' : 'Take photo/video'}</button>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"><Upload size={14} /> Upload</button>
        </div>
      </div>
      <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" className="hidden" onChange={(e) => add(e.target.files?.[0])} />
      <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => add(e.target.files?.[0])} />

      {loading ? <p className="text-sm text-zinc-400">Loading…</p> : items.length === 0 ? (
        <p className="text-xs text-zinc-400">No clips yet. Tap <strong>Take photo/video</strong> to capture this student in class.</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((m) => (
            <div key={m.id} className="min-w-0">
              <button onClick={() => setView(m)} className="relative aspect-square w-full rounded-lg overflow-hidden bg-zinc-100 border border-zinc-200 group block">
                {m.kind === 'photo'
                  ? <img src={m.url} alt="" className="w-full h-full object-cover" />
                  : <><video src={m.url + '#t=0.5'} className="w-full h-full object-cover" muted playsInline preload="metadata" /><span className="absolute inset-0 flex items-center justify-center bg-black/25"><Play size={22} className="text-white" /></span><span className="absolute top-1 left-1 text-[9px] font-bold bg-black/60 text-white px-1.5 py-0.5 rounded">🎥 video</span></>}
              </button>
              <div className="text-[11px] text-zinc-600 font-semibold truncate mt-1">{m.caption || (m.kind === 'video' ? 'Untitled video' : 'Untitled photo')}</div>
            </div>
          ))}
        </div>
      )}

      {view && <MediaModal media={view} onClose={() => setView(null)} onDelete={() => del(view.id)} onEmail={() => emailParent(view.id)} onRename={() => rename(view)} sending={sending === view.id} />}
    </div>
  )
}

function MediaModal({ media, onClose, onDelete, onEmail, onRename, sending }: { media: Media; onClose: () => void; onDelete: () => void; onEmail: () => void; onRename: () => void; sending: boolean }) {
  const vidRef = useRef<HTMLVideoElement | null>(null)
  const [rate, setRate] = useState(1)
  const setSpeed = (r: number) => { setRate(r); if (vidRef.current) vidRef.current.playbackRate = r }
  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 text-white gap-2">
          <button onClick={onRename} className="font-bold text-sm inline-flex items-center gap-1.5 hover:text-amber-300 min-w-0"><span className="truncate">{media.caption || (media.kind === 'video' ? 'Untitled video' : 'Untitled photo')}</span><Pencil size={13} className="shrink-0" /></button>
          <button onClick={onClose} className="text-zinc-400 hover:text-white shrink-0"><X size={20} /></button>
        </div>
        <div className="bg-black flex items-center justify-center max-h-[60vh]">
          {media.kind === 'photo'
            ? <img src={media.url} alt="" className="max-h-[60vh] w-auto" />
            : <video ref={vidRef} src={media.url} controls autoPlay playsInline className="max-h-[60vh] w-full" />}
        </div>
        <div className="p-3 flex items-center gap-2 flex-wrap">
          {media.kind === 'video' && (
            <div className="inline-flex bg-zinc-100 rounded-full p-1 text-xs font-bold">
              <span className="px-2 py-1.5 text-zinc-500">Slow-mo:</span>
              {[0.25, 0.5, 1].map((r) => <button key={r} onClick={() => setSpeed(r)} className={`px-3 py-1.5 rounded-full ${rate === r ? 'bg-white shadow text-zinc-900' : 'text-zinc-500'}`}>{r === 1 ? 'Normal' : `${r}×`}</button>)}
            </div>
          )}
          <div className="flex-1" />
          <button onClick={onRename} className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 text-sm font-bold px-3 py-2 rounded-lg"><Pencil size={14} /> Rename</button>
          <button onClick={onEmail} disabled={sending} className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-sm font-bold px-3 py-2 rounded-lg disabled:opacity-50"><Send size={14} /> {sending ? 'Sending…' : 'Send to parent'}</button>
          <button onClick={onDelete} className="inline-flex items-center gap-1.5 bg-white border border-red-200 text-red-600 text-sm font-bold px-3 py-2 rounded-lg"><Trash2 size={14} /> Delete</button>
        </div>
      </div>
    </div>
  )
}
