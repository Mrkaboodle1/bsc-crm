'use client'
import { useEffect, useRef, useState } from 'react'

export type Incident = {
  id?: string; report_no?: string; workshop_id?: string | null
  occurred_on: string; occurred_at?: string | null; location?: string | null
  report_type: string; severity?: string | null; children?: string | null; reporter_name?: string | null
  description?: string | null; action_taken?: string | null; injury_details?: string | null; witnesses?: string | null
  parent_notified?: boolean; parent_notified_details?: string | null
  media?: Array<{ type: string; url: string | null; name: string; path?: string }>
  eufy_evidence?: Array<Record<string, unknown>>
  status?: string; created_by?: string | null; created_at?: string
}

const TYPES = [['incident', 'Incident'], ['accident', 'Accident'], ['injury', 'Injury'], ['near_miss', 'Near miss']]
const SEVS = [['minor', 'Minor'], ['moderate', 'Moderate'], ['serious', 'Serious']]
const today = () => new Date().toISOString().slice(0, 10)
const blank = (): Incident => ({ occurred_on: today(), report_type: 'incident', severity: 'minor', parent_notified: false, media: [] })
const fmtDate = (d?: string) => d ? new Date(d + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : ''

// Web Speech API — talk instead of type. Not on every browser, so we feature-detect.
function useDictation(onText: (t: string) => void) {
  const recRef = useRef<any>(null)
  const [listening, setListening] = useState(false)
  const supported = typeof window !== 'undefined' && ((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition)
  const toggle = () => {
    if (!supported) { alert('Voice typing is not supported on this browser — please use Chrome.'); return }
    if (listening) { recRef.current?.stop(); return }
    const R = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
    const rec = new R(); rec.lang = 'en-AU'; rec.interimResults = false; rec.continuous = true
    rec.onresult = (e: any) => { let s = ''; for (let i = e.resultIndex; i < e.results.length; i++) s += e.results[i][0].transcript; if (s) onText(s + ' ') }
    rec.onend = () => setListening(false)
    rec.start(); recRef.current = rec; setListening(true)
  }
  return { supported, listening, toggle }
}

function MicField({ label, value, onChange, rows = 4, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const { supported, listening, toggle } = useDictation((t) => onChange((value ? value + ' ' : '') + t))
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">{label}</label>
        {supported && (
          <button type="button" onClick={toggle} className={`text-xs font-bold px-2 py-1 rounded-md ${listening ? 'bg-red-600 text-white animate-pulse' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
            {listening ? '● Listening… tap to stop' : '🎤 Talk'}
          </button>
        )}
      </div>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder}
        className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500" />
    </div>
  )
}

export function IncidentsClient({ initial }: { initial: Incident[] }) {
  const [rows, setRows] = useState<Incident[]>(initial)
  const [editing, setEditing] = useState<Incident | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState('')

  const set = (k: keyof Incident, v: unknown) => setEditing((e) => e ? { ...e, [k]: v } as Incident : e)

  async function save() {
    if (!editing) return
    setSaving(true); setMsg('')
    const method = editing.id ? 'PATCH' : 'POST'
    const res = await fetch('/api/incidents', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    const d = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg(d.error || 'Could not save'); return }
    setRows((r) => { const other = r.filter((x) => x.id !== d.row.id); return [d.row, ...other] })
    setEditing(null)
  }

  async function upload(file: File) {
    setUploading(true)
    const fd = new FormData(); fd.append('file', file)
    const res = await fetch('/api/incidents/upload', { method: 'POST', body: fd })
    const d = await res.json(); setUploading(false)
    if (res.ok && editing) set('media', [...(editing.media || []), d.media])
    else setMsg(d.error || 'Upload failed')
  }

  function emailReport(r: Incident) {
    const lines = [
      `Big Star Circus — ${r.report_type?.toUpperCase()} report ${r.report_no || ''}`,
      `Date: ${fmtDate(r.occurred_on)} ${r.occurred_at || ''}`,
      `Location: ${r.location || '-'}`, `Children: ${r.children || '-'}`,
      `Reported by: ${r.reporter_name || '-'}   Severity: ${r.severity || '-'}`,
      '', `What happened:\n${r.description || '-'}`, '', `Action taken:\n${r.action_taken || '-'}`,
      '', `Injuries / first aid:\n${r.injury_details || '-'}`, `Witnesses: ${r.witnesses || '-'}`,
      `Parent notified: ${r.parent_notified ? 'Yes' : 'No'} ${r.parent_notified_details || ''}`,
    ].join('\n')
    window.location.href = `mailto:?subject=${encodeURIComponent(`Incident report ${r.report_no || ''} — Big Star Circus`)}&body=${encodeURIComponent(lines)}`
  }

  return (
    <div className="max-w-5xl">
      {!editing && (
        <div className="flex items-center justify-between mb-4 no-print">
          <p className="text-sm text-zinc-500">One form for every incident, accident or injury — editable, printable, emailable.</p>
          <button onClick={() => setEditing(blank())} className="bg-red-600 text-white font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-red-700">+ New report</button>
        </div>
      )}

      {editing ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 no-print">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Type</label>
              <select value={editing.report_type} onChange={(e) => set('report_type', e.target.value)} className="w-full border border-zinc-300 rounded-lg px-2 py-2 text-sm">{TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Severity</label>
              <select value={editing.severity || ''} onChange={(e) => set('severity', e.target.value)} className="w-full border border-zinc-300 rounded-lg px-2 py-2 text-sm">{SEVS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
            <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Date</label>
              <input type="date" value={editing.occurred_on} onChange={(e) => set('occurred_on', e.target.value)} className="w-full border border-zinc-300 rounded-lg px-2 py-2 text-sm" /></div>
            <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Time</label>
              <input type="time" value={editing.occurred_at || ''} onChange={(e) => set('occurred_at', e.target.value)} className="w-full border border-zinc-300 rounded-lg px-2 py-2 text-sm" /></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Children involved</label>
              <input value={editing.children || ''} onChange={(e) => set('children', e.target.value)} placeholder="e.g. Alex, Elizabeth" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" /></div>
            <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Reported by</label>
              <input value={editing.reporter_name || ''} onChange={(e) => set('reporter_name', e.target.value)} placeholder="Coach name" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" /></div>
          </div>
          <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Location</label>
            <input value={editing.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="Where it happened" className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" /></div>

          <MicField label="What happened" value={editing.description || ''} onChange={(v) => set('description', v)} rows={5} placeholder="Describe exactly what happened…" />
          <MicField label="Action taken" value={editing.action_taken || ''} onChange={(v) => set('action_taken', v)} rows={3} />
          <MicField label="Injuries / first aid given" value={editing.injury_details || ''} onChange={(v) => set('injury_details', v)} rows={2} />
          <div><label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Witnesses</label>
            <input value={editing.witnesses || ''} onChange={(e) => set('witnesses', e.target.value)} className="w-full border border-zinc-300 rounded-lg px-3 py-2 text-sm" /></div>
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
            <input type="checkbox" checked={!!editing.parent_notified} onChange={(e) => set('parent_notified', e.target.checked)} /> Parent / guardian notified
          </label>
          {editing.parent_notified && <MicField label="How the parent was notified / what was said" value={editing.parent_notified_details || ''} onChange={(v) => set('parent_notified_details', v)} rows={2} />}

          <div>
            <label className="text-[11px] font-extrabold uppercase tracking-wide text-zinc-500">Photo / video evidence</label>
            <input type="file" accept="image/*,video/*" capture onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f) }} className="block text-sm mt-1" />
            {uploading && <p className="text-xs text-zinc-500 mt-1">Uploading…</p>}
            <div className="flex flex-wrap gap-2 mt-2">
              {(editing.media || []).map((m, i) => <a key={i} href={m.url || '#'} target="_blank" className="text-xs bg-zinc-100 border border-zinc-200 rounded-md px-2 py-1">{m.type === 'video' ? '🎬' : '🖼️'} {m.name}</a>)}
            </div>
            <p className="text-[11px] text-zinc-400 mt-1">Tip: you can add your Eufy camera clip here too — download it from the Eufy app first so it isn’t deleted after a month.</p>
          </div>

          {msg && <p className="text-sm text-red-600">{msg}</p>}
          <div className="flex gap-2 pt-1">
            <button onClick={save} disabled={saving} className="bg-red-600 text-white font-bold text-sm px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50">{saving ? 'Saving…' : (editing.id ? 'Save changes' : 'Save report')}</button>
            <button onClick={() => setEditing(null)} className="bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg">Cancel</button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.length === 0 && <div className="bg-white rounded-2xl border border-zinc-200 p-8 text-center text-zinc-500">No reports yet. Tap “+ New report” to log one.</div>}
          {rows.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-zinc-200 p-4 print-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-zinc-900">{r.report_no}</span>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${r.report_type === 'injury' || r.severity === 'serious' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{r.report_type}{r.severity ? ` · ${r.severity}` : ''}</span>
                    <span className="text-xs text-zinc-500">{fmtDate(r.occurred_on)} {r.occurred_at || ''}</span>
                  </div>
                  <div className="text-sm text-zinc-800 mt-1"><b>Children:</b> {r.children || '-'} · <b>By:</b> {r.reporter_name || '-'}</div>
                  <p className="text-sm text-zinc-600 mt-1 whitespace-pre-wrap">{r.description}</p>
                  {r.injury_details && <p className="text-sm text-red-700 mt-1"><b>Injury:</b> {r.injury_details}</p>}
                  {(r.media || []).length > 0 && <div className="flex flex-wrap gap-2 mt-2 no-print">{(r.media || []).map((m, i) => <a key={i} href={m.url || '#'} target="_blank" className="text-xs bg-zinc-100 border border-zinc-200 rounded-md px-2 py-1">{m.type === 'video' ? '🎬' : '🖼️'} {m.name}</a>)}</div>}
                </div>
                <div className="flex flex-col gap-1.5 no-print shrink-0">
                  <button onClick={() => setEditing(r)} className="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-md">Edit</button>
                  <button onClick={() => window.print()} className="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-md">Print / PDF</button>
                  <button onClick={() => emailReport(r)} className="text-xs font-bold bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 rounded-md">Email</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
