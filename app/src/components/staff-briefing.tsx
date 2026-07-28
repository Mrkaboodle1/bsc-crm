'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, Megaphone, X } from 'lucide-react'

// Compact RED tile on /compliance that opens the full (printable) Term-4 staff
// briefing. Edit the content here (ask Jacky) — it's the single source.

export function StaffBriefing() {
  const [open, setOpen] = useState(false)
  return (
    <section className="mb-8">
      {/* Tile */}
      <button onClick={() => setOpen(true)} className="w-full text-left group bg-white rounded-lg border-2 border-[#D72027] px-4 py-3.5 hover:shadow-sm transition-all flex items-start gap-4">
        <span className="w-9 h-9 rounded-md bg-[#D72027] text-white flex items-center justify-center shrink-0"><Megaphone size={16} /></span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#D72027]">Must read · all staff</span>
          </div>
          <div className="text-sm font-bold text-zinc-900 leading-tight">Staff Briefing — New Rules from Term 4 (6 Oct 2026)</div>
          <p className="text-xs text-zinc-500 mt-0.5">Membership, holiday program, Kids Night Out & safety sign-in — what every coach &amp; admin must know.</p>
        </div>
        <span className="self-center text-xs font-semibold text-[#D72027] whitespace-nowrap">Read &amp; print →</span>
      </button>

      {open && createPortal(<BriefingModal onClose={() => setOpen(false)} />, document.body)}
    </section>
  )
}

function BriefingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <style>{`@media print{ body *{visibility:hidden!important} .briefing-print, .briefing-print *{visibility:visible!important} .briefing-print{position:absolute;left:0;top:0;width:100%;max-height:none;overflow:visible} .no-print{display:none!important} }`}</style>
      <div className="briefing-print bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#D72027] text-white px-5 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2"><Megaphone size={18} /><h2 className="font-extrabold text-sm sm:text-base">Staff Briefing — New Rules from Term 4 (6 Oct 2026)</h2></div>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="no-print inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"><Printer size={14} /> Print</button>
            <button onClick={onClose} className="no-print text-white/80 hover:text-white"><X size={20} /></button>
          </div>
        </div>
        <div className="p-5 space-y-4 text-sm text-zinc-700 leading-relaxed">
          <p className="text-zinc-500">All coaches and admin must read this. Nothing changes until Term 4 (6 Oct).</p>

          <Block n="1" title="All-year membership (GST-free, no tax)">
            <ul className="list-disc pl-5 space-y-0.5">
              <li>1st child: 1 class <b>$30/wk</b> · 2 classes <b>$50</b> ($25 each) · 3 classes <b>$60</b> ($20 each).</li>
              <li>Sibling: <b>$20 per class</b> ($20 / $40 / $60 for 1 / 2 / 3).</li>
              <li>Casual / non-member: <b>$37</b> per class.</li>
              <li>Billed <b>every week, all year (52 weeks)</b> — no school-holiday pause.</li>
            </ul>
          </Block>

          <Block n="2" title="School Holiday Program (included for members)">
            <ul className="list-disc pl-5 space-y-0.5">
              <li>School holidays: regular classes don't run. On a member's <b>regular class day</b> we run a full <b>9am–3pm (6hr) workshop</b> — covered by their weekly $30.</li>
              <li><b>Member rate only on their regular class day.</b> A different day = <b>$60</b> (no day-swapping). Extra days = $60 each.</li>
              <li><b>Members book first:</b> a ~<b>5-week window</b> each term (e.g. Term 3: opens 13 Jul, closes 10 Aug). After it closes, the public can book and late members may miss out.</li>
              <li>Member away / misses it? <b>Still charged that week</b> (all-year membership — weeks aren't cancelled or refunded).</li>
              <li>Non-members: <b>$60 per day</b>.</li>
            </ul>
          </Block>

          <Block n="3" title="Kids Night Out">
            <ul className="list-disc pl-5 space-y-0.5">
              <li><b>INCLUDED free for members</b> (their weekly fee covers it), <b>4× a year (1 per term)</b>, optional. Non-members $60.</li>
              <li><b>Members book first</b> here too before public spots open.</li>
            </ul>
          </Block>

          <Block n="4" title="Child safety — sign-in & sign-out (everyone)">
            <ul className="list-disc pl-5 space-y-0.5">
              <li>From Term 4, <b>every child is signed in and out</b> — StarBand tap or iPad login, <b>plus the coach's manual roll</b>.</li>
              <li>This is our <b>duty of care</b> and reflects Queensland's <b>Child Safe Standards</b> (Child Safe Organisations Act 2024).</li>
              <li>Know who's in your room and <b>who is authorised to collect each child</b> (on the tablet, with allergy / medical / support flags).</li>
            </ul>
          </Block>

          <Block n="5" title="Other rules">
            <ul className="list-disc pl-5 space-y-0.5">
              <li><b>Classes run all year</b> — including public holidays. (School-holiday weeks = workshops.)</li>
              <li>Missed a regular class? Up to <b>2 make-up classes per term</b> (notify in advance, same term).</li>
              <li>Cancellations need <b>3 weeks' notice</b>.</li>
            </ul>
          </Block>

          <p className="text-xs text-zinc-400 border-t border-zinc-100 pt-3">Questions? Ask Rhett. Also covered in the Coach Academy. Last updated 8 Jun 2026.</p>
        </div>
      </div>
    </div>
  )
}

function Block({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (<div><h3 className="font-extrabold text-zinc-900 mb-1">{n}. {title}</h3>{children}</div>)
}
