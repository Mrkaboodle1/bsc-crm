'use client'

import { useState } from 'react'
import { Plus, Pencil } from 'lucide-react'
import { AppointmentModal, type ApptCoach, type ApptRecord } from '@/components/appointment-modal'

export type ApptFull = {
  id: string; title: string; type: string; start_at: string; end_at: string | null; all_day: boolean | null
  location: string | null; description: string | null; notes: string | null; assigned_coach_id: string | null; fee: number | null; status: string
}

function brisParts(iso: string) {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-CA', { timeZone: 'Australia/Brisbane' }) // YYYY-MM-DD
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane' }) // HH:MM
  const pretty = d.toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Australia/Brisbane' })
  return { date, time, pretty }
}
function toRecord(a: ApptFull): ApptRecord {
  const s = brisParts(a.start_at), e = a.end_at ? brisParts(a.end_at) : s
  return { id: a.id, title: a.title, type: a.type, date: s.date, end_date: e.date, all_day: a.all_day ?? false, start_time: s.time, end_time: e.time, location: a.location, description: a.description, notes: a.notes, assigned_coach_id: a.assigned_coach_id, fee: a.fee }
}

export function ContactAppointments({ appts, coaches, familyId }: { appts: ApptFull[]; coaches: ApptCoach[]; familyId: string }) {
  const [modal, setModal] = useState<{ editing?: ApptRecord } | null>(null)
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs font-extrabold text-zinc-700"><span className="mr-1">📅</span>Appointments</div>
        <button onClick={() => setModal({})} className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D72027] hover:underline"><Plus size={12} /> Add</button>
      </div>
      {appts.length === 0 ? (
        <p className="text-xs text-zinc-500">None on file. Tap “Add” to book one.</p>
      ) : (
        <ul className="space-y-1.5 text-xs">
          {appts.map((a) => (
            <li key={a.id}>
              <button onClick={() => setModal({ editing: toRecord(a) })} className="w-full text-left group flex items-start gap-1.5 hover:bg-zinc-50 rounded-md px-1.5 py-1 -mx-1.5">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-zinc-800 truncate">{a.title}</div>
                  <div className="text-[10px] text-zinc-500">{brisParts(a.start_at).pretty}</div>
                </div>
                <Pencil size={11} className="text-zinc-300 group-hover:text-[#D72027] mt-0.5 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {modal && <AppointmentModal coaches={coaches} editing={modal.editing} relatedFamilyId={familyId} onClose={() => setModal(null)} />}
    </div>
  )
}
