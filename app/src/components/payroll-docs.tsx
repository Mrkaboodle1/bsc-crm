'use client'

import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X, FileText, NotebookPen, IdCard } from 'lucide-react'

type Key = 'invoice' | 'logbook' | 'tfn' | null

export function PayrollDocs() {
  const [open, setOpen] = useState<Key>(null)
  const tiles: { key: Exclude<Key, null>; title: string; desc: string; Icon: typeof FileText }[] = [
    { key: 'invoice', title: 'Contractor Invoice Template', desc: 'For coaches who invoice you (ABN). Print & fill, or use as a guide.', Icon: FileText },
    { key: 'logbook', title: 'Trainee Logbook (printable)', desc: 'Blank hours logbook to print. (Digital version: Coach Academy → Logbook.)', Icon: NotebookPen },
    { key: 'tfn', title: 'TFN & ABN — who needs what', desc: 'Employees need a TFN; contractors need an ABN. How to get each.', Icon: IdCard },
  ]
  return (
    <section className="mb-8">
      <h2 className="text-sm font-extrabold text-zinc-500 tracking-widest mb-3">PAYROLL & FORMS</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {tiles.map((t) => (
          <button key={t.key} onClick={() => setOpen(t.key)} className="text-left group bg-white rounded-lg border border-zinc-200 px-4 py-3.5 hover:border-[#D72027] hover:shadow-sm transition-all flex items-start gap-3">
            <span className="w-9 h-9 rounded-md bg-amber-50 text-[#B45309] flex items-center justify-center shrink-0 ring-1 ring-inset ring-amber-100"><t.Icon size={16} /></span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-zinc-900 leading-tight">{t.title}</div>
              <p className="text-xs text-zinc-500 mt-0.5">{t.desc}</p>
              <span className="text-xs font-semibold text-[#D72027] mt-1 inline-block">Open &amp; print →</span>
            </div>
          </button>
        ))}
      </div>
      {open && createPortal(<DocModal which={open} onClose={() => setOpen(null)} />, document.body)}
    </section>
  )
}

function DocModal({ which, onClose }: { which: Exclude<Key, null>; onClose: () => void }) {
  const title = which === 'invoice' ? 'Contractor Invoice Template' : which === 'logbook' ? 'Trainee Logbook' : 'TFN & ABN — who needs what'
  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <style>{`@media print{ body *{visibility:hidden!important} .doc-print, .doc-print *{visibility:visible!important} .doc-print{position:absolute;left:0;top:0;width:100%;max-height:none;overflow:visible} .no-print{display:none!important} }`}</style>
      <div className="doc-print bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-zinc-900 text-white px-5 py-3 flex items-center justify-between">
          <h2 className="font-extrabold text-sm sm:text-base">{title}</h2>
          <div className="flex items-center gap-2">
            <button onClick={() => window.print()} className="no-print inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"><Printer size={14} /> Print</button>
            <button onClick={onClose} className="no-print text-white/80 hover:text-white"><X size={20} /></button>
          </div>
        </div>
        <div className="p-5 text-sm text-zinc-700">{which === 'invoice' ? <Invoice /> : which === 'logbook' ? <Logbook /> : <Tfn />}</div>
      </div>
    </div>
  )
}

const line = 'border-b border-zinc-400 inline-block min-w-[160px] align-bottom'
function Invoice() {
  return (
    <div className="space-y-3 leading-relaxed">
      <p className="font-extrabold text-lg">TAX INVOICE</p>
      <p><b>From (contractor):</b><br />Name: <span className={line} /><br />ABN: <span className={line} /> &nbsp;<span className="text-xs text-zinc-500">(no ABN = 47% withheld — get one)</span><br />Phone / email: <span className={line} /></p>
      <p><b>Bill to:</b> Big Star Circus Pty Ltd · ABN 18 678 780 722 · Unit 1/14 Harper St, Molendinar QLD 4214</p>
      <p>Invoice #: <span className="border-b border-zinc-400 inline-block min-w-[80px]" /> &nbsp; Date: <span className="border-b border-zinc-400 inline-block min-w-[100px]" /> &nbsp; Period: <span className="border-b border-zinc-400 inline-block min-w-[140px]" /></p>
      <table className="w-full border-collapse text-xs">
        <thead><tr className="bg-zinc-100">{['Date', 'Description', 'Hours', 'Rate', 'Amount'].map((h) => <th key={h} className="border border-zinc-300 p-2 text-left">{h}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 5 }).map((_, i) => <tr key={i}>{Array.from({ length: 5 }).map((__, j) => <td key={j} className="border border-zinc-300 p-3"></td>)}</tr>)}
          <tr><td colSpan={4} className="border border-zinc-300 p-2 text-right font-bold">Subtotal</td><td className="border border-zinc-300 p-2"></td></tr>
          <tr><td colSpan={4} className="border border-zinc-300 p-2 text-right">GST (only if GST-registered)</td><td className="border border-zinc-300 p-2"></td></tr>
          <tr><td colSpan={4} className="border border-zinc-300 p-2 text-right font-extrabold">TOTAL</td><td className="border border-zinc-300 p-2"></td></tr>
        </tbody>
      </table>
      <p><b>Super (paid by Big Star, not on this invoice):</b> Fund <span className={line} /> Member # <span className={line} /></p>
      <p><b>Payment:</b> Account name <span className={line} /> BSB <span className="border-b border-zinc-400 inline-block min-w-[70px]" /> Acct # <span className={line} /></p>
      <p className="text-xs text-zinc-500 no-print border-t border-zinc-100 pt-2">Reminder: contractors only (genuine ABN). Your young trainees are employees, not contractors — they don&apos;t invoice. Confirm with your accountant.</p>
    </div>
  )
}

function Logbook() {
  return (
    <div className="space-y-3 leading-relaxed">
      <p>Trainee name: <span className={line} /> &nbsp; Level: <span className={line} /></p>
      <p>Term / dates: <span className={line} /></p>
      <p>Goals this term: <span className="border-b border-zinc-400 inline-block w-full" /></p>
      <table className="w-full border-collapse text-xs mt-2">
        <thead><tr className="bg-zinc-100">{['Date', 'Time in', 'Time out', 'Total', 'What I coached', 'Coach signature'].map((h) => <th key={h} className="border border-zinc-300 p-2 text-left">{h}</th>)}</tr></thead>
        <tbody>{Array.from({ length: 16 }).map((_, i) => <tr key={i}>{Array.from({ length: 6 }).map((__, j) => <td key={j} className="border border-zinc-300 p-3"></td>)}</tr>)}
          <tr><td colSpan={3} className="border border-zinc-300 p-2 text-right font-extrabold">Total hours</td><td colSpan={3} className="border border-zinc-300 p-2"></td></tr>
        </tbody>
      </table>
      <p className="text-xs text-zinc-500 no-print">Tip: the digital logbook (Coach Academy → Open trainee logbooks) does this automatically — this printable is for handing out.</p>
    </div>
  )
}

function Tfn() {
  return (
    <div className="space-y-4 leading-relaxed">
      <div>
        <h3 className="font-extrabold text-zinc-900">Employees (your coaches & junior trainees) → TFN</h3>
        <ul className="list-disc pl-5 mt-1 space-y-0.5">
          <li>Need a <b>Tax File Number (TFN)</b>, NOT an ABN — they work under your direction.</li>
          <li>Free, ~5 min: apply at <b>ato.gov.au</b> (under-18s can apply). Without it you withhold tax at the top rate.</li>
          <li>They complete a <b>TFN Declaration</b> when they start; you keep it on file.</li>
          <li>Under-18 working ≤30 hrs/week → <b>no super</b>.</li>
        </ul>
        <a href="https://www.opc.gov.au/sites/default/files/2024-09/TFN_declaration_form_N3092.pdf" target="_blank" rel="noreferrer" className="no-print inline-flex items-center gap-2 mt-3 bg-[#D72027] hover:bg-[#A0151B] text-white font-semibold text-sm px-4 py-2 rounded-lg">
          <FileText size={15} /> Download the official TFN Declaration form (ATO)
        </a>
        <p className="text-[11px] text-zinc-400 mt-1">Print one for each new starter to fill in, or they can do it online via myGov/ATO.</p>
      </div>
      <div>
        <h3 className="font-extrabold text-zinc-900">Genuine contractors (e.g. your new adult coach) → ABN</h3>
        <ul className="list-disc pl-5 mt-1 space-y-0.5">
          <li>Need an <b>ABN</b> (free) and they <b>invoice you</b>.</li>
          <li>No ABN = you must withhold <b>47%</b>.</li>
          <li>Labour-only contract → <b>you pay their super</b> on top.</li>
        </ul>
        <a href="https://www.abr.gov.au/business-super-funds-charities/applying-abn" target="_blank" rel="noreferrer" className="no-print inline-flex items-center gap-2 mt-3 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-sm px-4 py-2 rounded-lg">
          <IdCard size={15} /> Apply for an ABN (free — Australian Business Register)
        </a>
        <p className="text-[11px] text-zinc-400 mt-1">It&apos;s free at abr.gov.au — beware copycat sites that charge a fee.</p>
      </div>
      <p className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-amber-800 text-xs"><b>Key rule:</b> a minor doing your coaching work is an <b>employee</b> (TFN), not a contractor (ABN). Don&apos;t give kids ABNs to save admin — it&apos;s sham contracting. Confirm everything with your accountant.</p>
    </div>
  )
}
