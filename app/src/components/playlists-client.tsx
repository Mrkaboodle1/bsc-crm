'use client'

import { useState, useRef } from 'react'
import { createBrowserSupabase } from '@/lib/supabase'
import { Plus, Trash2, Upload, ChevronUp, ChevronDown, Music, ListMusic, Video, X, Search } from 'lucide-react'

export type Track = { title: string; url: string; yt?: string }
export type Playlist = { id: string; name: string; tracks: Track[] }

async function uploadAudio(file: File): Promise<string> {
  const supabase = createBrowserSupabase()
  const ext = (file.name.split('.').pop() || 'mp3').toLowerCase().replace(/[^a-z0-9]/g, '')
  const path = `music/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await supabase.storage.from('workshop-media').upload(path, file, { upsert: false, contentType: file.type })
  if (error) throw new Error(error.message)
  return supabase.storage.from('workshop-media').getPublicUrl(path).data.publicUrl
}

export function PlaylistsClient({ initial }: { initial: Playlist[] }) {
  const [lists, setLists] = useState<Playlist[]>(initial)
  const [sel, setSel] = useState<string | null>(initial[0]?.id ?? null)
  const [uploading, setUploading] = useState(false)
  const [ytOpen, setYtOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement | null>(null)
  const active = lists.find((l) => l.id === sel) ?? null

  function addYtTrack(t: { videoId: string; title: string }) {
    if (!active) return
    saveTracks(active.id, [...active.tracks, { title: t.title, url: `https://www.youtube.com/watch?v=${t.videoId}`, yt: t.videoId }])
  }

  async function create() {
    const name = window.prompt('Playlist name (e.g. "Tuesday Junior Aerial Showcase")')
    if (!name?.trim()) return
    const r = await fetch('/api/playlists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.trim() }) })
    const j = await r.json(); if (j.ok) { setLists((xs) => [...xs, j.playlist]); setSel(j.playlist.id) } else alert(j.error || 'Could not create')
  }
  async function saveTracks(id: string, tracks: Track[]) {
    setLists((xs) => xs.map((l) => l.id === id ? { ...l, tracks } : l))
    fetch('/api/playlists', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tracks }) }).catch(() => {})
  }
  async function rename(l: Playlist) {
    const name = window.prompt('Rename playlist', l.name); if (!name?.trim()) return
    setLists((xs) => xs.map((x) => x.id === l.id ? { ...x, name: name.trim() } : x))
    fetch('/api/playlists', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: l.id, name: name.trim() }) }).catch(() => {})
  }
  async function del(l: Playlist) {
    if (!confirm(`Delete playlist "${l.name}"?`)) return
    setLists((xs) => xs.filter((x) => x.id !== l.id)); if (sel === l.id) setSel(null)
    fetch(`/api/playlists?id=${l.id}`, { method: 'DELETE' }).catch(() => {})
  }
  async function addTrack(file?: File | null) {
    if (!file || !active) return
    setUploading(true)
    try {
      const url = await uploadAudio(file)
      const title = file.name.replace(/\.[^.]+$/, '')
      saveTracks(active.id, [...active.tracks, { title, url }])
    } catch (e) { alert(e instanceof Error ? e.message : 'Upload failed') } finally { setUploading(false) }
  }
  function move(i: number, d: number) {
    if (!active) return
    const t = [...active.tracks]; const j = i + d; if (j < 0 || j >= t.length) return
    ;[t[i], t[j]] = [t[j]!, t[i]!]; saveTracks(active.id, t)
  }
  function removeTrack(i: number) { if (!active) return; saveTracks(active.id, active.tracks.filter((_, x) => x !== i)) }

  return (
    <div className="grid sm:grid-cols-[220px_1fr] gap-4">
      {/* playlists list */}
      <div className="space-y-2">
        <button onClick={create} className="w-full inline-flex items-center justify-center gap-2 bg-[#D72027] text-white font-bold text-sm px-3 py-2.5 rounded-xl hover:bg-[#A0151B]"><Plus size={16} /> New playlist</button>
        {lists.length === 0 && <p className="text-xs text-zinc-400 px-1">No playlists yet.</p>}
        {lists.map((l) => (
          <button key={l.id} onClick={() => setSel(l.id)} className={`w-full text-left rounded-xl px-3 py-2.5 border ${sel === l.id ? 'border-[#D72027] bg-red-50' : 'border-zinc-200 bg-white hover:bg-zinc-50'}`}>
            <div className="font-bold text-sm text-zinc-800 flex items-center gap-1.5"><ListMusic size={14} className="text-[#D72027]" /> {l.name}</div>
            <div className="text-[11px] text-zinc-400">{l.tracks.length} track{l.tracks.length === 1 ? '' : 's'}</div>
          </button>
        ))}
      </div>

      {/* selected playlist */}
      <div>
        {!active ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-sm text-zinc-500"><Music size={24} className="mx-auto text-zinc-300 mb-2" />Pick a playlist, or make a new one.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h3 className="font-extrabold text-zinc-900">{active.name}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white text-xs font-bold px-3 py-2 rounded-lg disabled:opacity-50"><Upload size={14} /> {uploading ? 'Uploading…' : 'Upload song'}</button>
                <button onClick={() => setYtOpen(true)} className="inline-flex items-center gap-1.5 bg-white border border-zinc-200 text-zinc-700 text-xs font-bold px-3 py-2 rounded-lg"><Video size={14} className="text-red-600" /> Search YouTube</button>
                <button onClick={() => rename(active)} className="text-xs font-semibold text-zinc-500 px-2 py-2 hover:text-zinc-800">Rename</button>
                <button onClick={() => del(active)} className="text-xs font-semibold text-red-600 px-2 py-2">Delete</button>
              </div>
            </div>
            <input ref={fileRef} type="file" accept="audio/*" className="hidden" onChange={(e) => addTrack(e.target.files?.[0])} />
            {active.tracks.length === 0 ? (
              <p className="text-xs text-zinc-400">No songs yet. Tap <strong>Add song</strong> to upload an audio file.</p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {active.tracks.map((t, i) => (
                  <li key={i} className="flex items-center gap-2 py-2">
                    <span className="text-xs text-zinc-400 w-5">{i + 1}</span>
                    {t.yt ? <Video size={14} className="text-red-600 shrink-0" /> : <Music size={14} className="text-zinc-400 shrink-0" />}
                    <span className="flex-1 min-w-0 truncate text-sm text-zinc-800">{t.title}</span>
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="text-zinc-300 hover:text-zinc-700 disabled:opacity-30"><ChevronUp size={15} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === active.tracks.length - 1} className="text-zinc-300 hover:text-zinc-700 disabled:opacity-30"><ChevronDown size={15} /></button>
                    <button onClick={() => removeTrack(i)} className="text-zinc-300 hover:text-red-600"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[11px] text-zinc-400 mt-3">⚠️ Only upload music you have the right to use. This plays in the studio player (📻 bottom-right) under “Your playlists”.</p>
          </div>
        )}
      </div>

      {ytOpen && active && <YtSearchModal onClose={() => setYtOpen(false)} onAdd={addYtTrack} />}
    </div>
  )
}

function YtSearchModal({ onClose, onAdd }: { onClose: () => void; onAdd: (t: { videoId: string; title: string }) => void }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [results, setResults] = useState<Array<{ videoId: string; title: string; channel: string; thumb: string }>>([])
  const [added, setAdded] = useState<Set<string>>(new Set())
  async function search() {
    if (!q.trim()) return
    setBusy(true); setErr('')
    try {
      const r = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}`)
      const j = await r.json()
      if (j.ok) setResults(j.results); else setErr(j.error || 'Search failed')
    } catch { setErr('Search failed') } finally { setBusy(false) }
  }
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-zinc-100"><h3 className="font-extrabold text-zinc-900 inline-flex items-center gap-2"><Video size={18} className="text-red-600" /> Search YouTube</h3><button onClick={onClose} className="text-zinc-400 hover:text-zinc-700"><X size={20} /></button></div>
        <div className="p-5 space-y-3">
          <form onSubmit={(e) => { e.preventDefault(); search() }} className="flex gap-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Song or artist…" autoFocus className="flex-1 px-3 py-2.5 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#D72027]" />
            <button type="submit" disabled={busy} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white font-bold text-sm px-4 py-2.5 rounded-lg disabled:opacity-50"><Search size={15} /> {busy ? '…' : 'Search'}</button>
          </form>
          {err && <p className="text-sm text-red-600">{err}</p>}
          <ul className="space-y-1.5">
            {results.map((r) => (
              <li key={r.videoId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50">
                {r.thumb && <img src={r.thumb} alt="" className="w-12 h-9 object-cover rounded shrink-0" />}
                <div className="flex-1 min-w-0"><div className="text-sm font-semibold text-zinc-800 truncate">{r.title}</div><div className="text-[11px] text-zinc-400 truncate">{r.channel}</div></div>
                <button onClick={() => { onAdd({ videoId: r.videoId, title: r.title }); setAdded((s) => new Set(s).add(r.videoId)) }} disabled={added.has(r.videoId)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-zinc-900 text-white disabled:bg-emerald-600">{added.has(r.videoId) ? 'Added ✓' : '+ Add'}</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
