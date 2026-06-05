'use client'
import { Printer } from 'lucide-react'

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="print:hidden inline-flex items-center gap-2 bg-[#D72027] text-white font-semibold text-sm px-5 py-2.5 rounded-lg shadow-sm hover:bg-[#A0151B]">
      <Printer size={16} /> Print / Save as PDF
    </button>
  )
}
