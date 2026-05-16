'use client'

import { useMemo, useState, useTransition } from 'react'
import { importFamilies, type ImportResult } from './actions'

// Canonical column targets the importer understands. Order matters for the
// "Map columns" UI — we show common Tectonic CRM fields first.
const TARGETS = [
  { key: 'family_name',     label: 'Family name *', required: true },
  { key: 'primary_parent',  label: 'Primary parent', required: false },
  { key: 'email',           label: 'Email', required: false },
  { key: 'phone',           label: 'Phone', required: false },
  { key: 'emergency_phone', label: 'Emergency phone', required: false },
  { key: 'address',         label: 'Address', required: false },
  { key: 'source',          label: 'Source (fb_ad/instagram/google/word_of_mouth/school/walkin/open_day/other)', required: false },
  { key: 'lifecycle_stage', label: 'Lifecycle stage (lead/trial/active/paused/past/lost)', required: false },
  { key: 'weekly_fee_total',label: 'Weekly fee total ($)', required: false },
  { key: 'notes',           label: 'Notes', required: false },
  { key: 'tags',            label: 'Tags (comma-separated)', required: false },
] as const

// Common header name → target field. Used to AUTO-MAP columns when Rhett
// imports a Tectonic CSV — most of his column names will match these patterns
// and he'll only have to confirm/adjust a couple.
const AUTO_MAP: Record<string, string> = {
  'family name': 'family_name',
  'familyname': 'family_name',
  'family': 'family_name',
  'surname': 'family_name',
  'last name': 'family_name',
  'name': 'family_name',
  'primary parent': 'primary_parent',
  'parent name': 'primary_parent',
  'parent': 'primary_parent',
  'mother': 'primary_parent',
  'mum': 'primary_parent',
  'first name': 'primary_parent',
  'guardian': 'primary_parent',
  'contact name': 'primary_parent',
  'email': 'email',
  'email address': 'email',
  'parent email': 'email',
  'e-mail': 'email',
  'phone': 'phone',
  'mobile': 'phone',
  'phone number': 'phone',
  'contact number': 'phone',
  'cell': 'phone',
  'emergency': 'emergency_phone',
  'emergency contact': 'emergency_phone',
  'emergency phone': 'emergency_phone',
  'address': 'address',
  'street address': 'address',
  'postal address': 'address',
  'source': 'source',
  'how they found us': 'source',
  'referral': 'source',
  'lead source': 'source',
  'stage': 'lifecycle_stage',
  'lifecycle': 'lifecycle_stage',
  'lifecycle stage': 'lifecycle_stage',
  'status': 'lifecycle_stage',
  'weekly fee': 'weekly_fee_total',
  'fee': 'weekly_fee_total',
  'price': 'weekly_fee_total',
  'amount': 'weekly_fee_total',
  'notes': 'notes',
  'note': 'notes',
  'comment': 'notes',
  'tags': 'tags',
  'tag': 'tags',
  'labels': 'tags',
}

type ParsedCsv = {
  headers: string[]
  rows: string[][]
}

function parseCsv(text: string): ParsedCsv {
  // Minimal CSV parser — handles quoted fields with commas, escaped quotes,
  // and \r\n line endings. Good enough for typical Tectonic exports.
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else { inQuotes = false }
      } else {
        cell += c
      }
    } else {
      if (c === '"') {
        inQuotes = true
      } else if (c === ',') {
        row.push(cell); cell = ''
      } else if (c === '\n' || c === '\r') {
        if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = '' }
        if (c === '\r' && text[i + 1] === '\n') i++
      } else {
        cell += c
      }
    }
  }
  if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row) }
  if (rows.length === 0) return { headers: [], rows: [] }
  const headers = rows[0]!.map((h) => h.trim())
  return { headers, rows: rows.slice(1).filter((r) => r.some((c) => c.trim() !== '')) }
}

function autoMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const h of headers) {
    const key = h.toLowerCase().trim()
    if (AUTO_MAP[key]) map[h] = AUTO_MAP[key]!
  }
  return map
}

export function ImportForm() {
  const [filename, setFilename] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleFile(file: File) {
    setError(null)
    setResult(null)
    setFilename(file.name)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const p = parseCsv(text)
        setParsed(p)
        setMapping(autoMap(p.headers))
      } catch (e) {
        setError((e as Error).message)
      }
    }
    reader.onerror = () => setError('Could not read file')
    reader.readAsText(file)
  }

  const mappedRows = useMemo(() => {
    if (!parsed) return []
    // Build the column-to-target lookup
    const headerToTarget: Array<[number, string]> = []
    parsed.headers.forEach((h, i) => {
      const t = mapping[h]
      if (t) headerToTarget.push([i, t])
    })
    return parsed.rows.map((row) => {
      const out: Record<string, string> = {}
      for (const [idx, target] of headerToTarget) {
        out[target] = (row[idx] ?? '').trim()
      }
      return out
    })
  }, [parsed, mapping])

  const previewRows = mappedRows.slice(0, 5)
  const hasFamilyName = Object.values(mapping).includes('family_name')

  function submit() {
    if (!hasFamilyName) {
      setError('You must map at least one column to "Family name".')
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await importFamilies(mappedRows)
      setResult(res)
    })
  }

  return (
    <div className="space-y-5">
      {/* Step 1 — pick a file */}
      <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-2">
          Step 1 — Drop your CSV
        </label>
        <div
          className="border-2 border-dashed border-zinc-300 rounded-xl p-6 text-center hover:border-[#D72027] transition-colors"
          onDragOver={(e) => { e.preventDefault() }}
          onDrop={(e) => {
            e.preventDefault()
            const f = e.dataTransfer.files?.[0]
            if (f) handleFile(f)
          }}
        >
          <input
            id="csv-input"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
          <label htmlFor="csv-input" className="cursor-pointer block">
            <div className="text-4xl mb-2">📄</div>
            <p className="font-bold text-zinc-700">
              {filename ? filename : 'Click to choose a CSV file, or drag it here'}
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              {parsed ? `${parsed.headers.length} columns · ${parsed.rows.length} rows detected` : 'Common: Tectonic CRM export, Mailchimp list, Google Sheet'}
            </p>
          </label>
        </div>
      </div>

      {/* Step 2 — map columns */}
      {parsed && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
            Step 2 — Match your CSV columns to BSC fields
          </label>
          <p className="text-xs text-zinc-500 mb-4">
            I auto-mapped the obvious ones. Adjust anything that looks wrong. Columns left as <em>— skip —</em> won&apos;t be imported.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {parsed.headers.map((h) => (
              <div key={h} className="flex items-center gap-2 text-sm">
                <span className="flex-1 min-w-0 truncate font-bold text-zinc-700">{h}</span>
                <span className="text-zinc-400">→</span>
                <select
                  value={mapping[h] ?? ''}
                  onChange={(e) => setMapping({ ...mapping, [h]: e.target.value })}
                  className="px-2 py-1.5 border-2 border-zinc-200 rounded-lg text-xs font-bold focus:border-[#D72027] focus:outline-none w-56"
                >
                  <option value="">— skip —</option>
                  {TARGETS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — preview */}
      {parsed && previewRows.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-zinc-200 p-5">
          <label className="block text-xs font-extrabold uppercase tracking-wider text-zinc-500 mb-3">
            Step 3 — Preview (first 5 rows after mapping)
          </label>
          <div className="overflow-x-auto">
            <table className="text-xs w-full">
              <thead>
                <tr className="text-left">
                  {TARGETS.filter((t) => Object.values(mapping).includes(t.key)).map((t) => (
                    <th key={t.key} className="px-2 py-1 font-bold text-zinc-500 border-b border-zinc-200">{t.key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100">
                    {TARGETS.filter((t) => Object.values(mapping).includes(t.key)).map((t) => (
                      <td key={t.key} className="px-2 py-1 text-zinc-800 truncate max-w-[200px]">
                        {String(r[t.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Step 4 — submit */}
      {parsed && (
        <div className="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-300 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm">
            <div className="font-extrabold text-zinc-900">{mappedRows.length} families ready to import</div>
            <div className="text-xs text-zinc-500 mt-1">
              Families with an email already in your CRM will be <strong>updated</strong> (not duplicated).
            </div>
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !hasFamilyName || mappedRows.length === 0}
            className="bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold text-sm px-5 py-3 rounded-xl shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pending ? 'Importing…' : `🚀 Import ${mappedRows.length} families`}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 rounded-r-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className={`rounded-r-xl px-4 py-3 text-sm border-l-4 ${result.ok ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-amber-50 border-amber-500 text-amber-900'}`}>
          <div className="font-extrabold mb-1">
            {result.ok ? '✅ Import complete' : '⚠ Import finished with issues'}
          </div>
          <div className="text-xs">
            Inserted: <strong>{result.inserted}</strong> · Updated: <strong>{result.updated}</strong> · Skipped: <strong>{result.skipped}</strong>
          </div>
          {result.errors.length > 0 && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs font-bold">Show {result.errors.length} issue{result.errors.length === 1 ? '' : 's'}</summary>
              <ul className="text-xs mt-2 space-y-0.5 max-h-48 overflow-auto">
                {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </details>
          )}
          <div className="mt-2 text-xs">
            <a href="/families" className="font-bold underline">Open Families →</a>
          </div>
        </div>
      )}
    </div>
  )
}
