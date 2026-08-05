'use client'
import { useState } from 'react'
import { SignaturePad } from './signature-pad'

export type WaiverState = {
  termsAgreed: boolean
  consentPhoto: 'yes' | 'no' | 'unsure' | ''
  signature: string
  signerName: string
  publicHolidays: boolean
}

export const emptyWaiver: WaiverState = { termsAgreed: false, consentPhoto: '', signature: '', signerName: '', publicHolidays: false }

// Returns an error string when the family hasn't completed the waiver — the
// form must not submit until this returns null.
export function waiverError(w: WaiverState, opts?: { requireHolidays?: boolean }): string | null {
  if (!w.termsAgreed) return 'Please read and tick the liability waiver.'
  if (!w.consentPhoto) return 'Please choose a photo & media consent option.'
  if (!w.signerName.trim()) return 'Please type the name of the parent or guardian signing.'
  if (!w.signature) return 'Please sign in the signature box.'
  if (opts?.requireHolidays && !w.publicHolidays) return 'Please acknowledge the public holidays note.'
  return null
}

const WAIVER_TEXT = `BIGSTAR CIRCUS — LIABILITY WAIVER & MEDIA RELEASE

1. Risk. Circus, acrobatic and aerial activities involve inherent physical risk. I understand that injury can occur during, before or after classes, and that participation is voluntary.

2. Release. I/we will not hold BigStar Circus, its coaches, staff or volunteers responsible or accountable for any personal injury, or any personal property loss or damage, which may occur on the premises before, during or after classes — except where caused by proven negligence, and nothing in this waiver excludes rights I have under the Australian Consumer Law.

3. Health & fitness. I confirm my child is medically fit to participate, and I have disclosed all medical conditions, allergies, injuries and additional needs on this form. I will inform BigStar Circus of any changes.

4. Supervision & behaviour. Children must follow all coach instructions and safety rules. BigStar Circus may pause a child's participation where behaviour presents a safety risk.

5. First aid. In an emergency, and where I cannot be contacted, I consent to BigStar Circus obtaining medical or ambulance assistance for my child at my expense.

6. Media release. Photos and video may be taken during classes, shows and events. I choose separately below whether BigStar Circus may use images or footage of my child for promotional purposes (website, social media, printed material). Choosing "No" will not affect my child's participation in any way.

7. Public holidays. Circus classes continue as usual on public holidays. These sessions are charged as part of the regular schedule and are not counted as a missed class.

8. Privacy. Personal details are used only to run classes, contact families and meet safety obligations. They are never sold or shared for marketing by third parties.

By typing my name and signing below I confirm I am the parent or legal guardian of the child/children named on this form, and that I have read, understood and agreed to this waiver.`

export function WaiverConsent({ value, onChange, showHolidays = true }: {
  value: WaiverState
  onChange: (v: WaiverState) => void
  showHolidays?: boolean
}) {
  const [openWaiver, setOpenWaiver] = useState(false)
  const set = <K extends keyof WaiverState>(k: K, v: WaiverState[K]) => onChange({ ...value, [k]: v })
  const inp = 'w-full px-3 py-2.5 border border-zinc-300 rounded-lg text-sm focus:border-[#D72027] focus:outline-none'

  return (
    <div className="border-2 border-[#D72027]/25 rounded-2xl p-4 bg-red-50/30 space-y-4">
      <div className="text-sm font-black text-[#D72027] uppercase tracking-wide">Waiver &amp; consent</div>

      {/* 1. Liability waiver */}
      <div>
        <label className="flex gap-2.5 items-start text-sm text-zinc-800">
          <input type="checkbox" checked={value.termsAgreed} onChange={(e) => set('termsAgreed', e.target.checked)} className="mt-1 w-4 h-4 accent-[#D72027] shrink-0" />
          <span>
            I have read and agree to the{' '}
            <button type="button" onClick={() => setOpenWaiver((o) => !o)} className="font-bold text-[#D72027] underline">
              BigStar Circus liability waiver &amp; media release
            </button>
            . I/we will not hold BigStar Circus responsible for any personal injury or property damage which may occur on the premises before, during or after classes. *
          </span>
        </label>
        {openWaiver && (
          <div className="mt-2 max-h-56 overflow-y-auto bg-white border border-zinc-200 rounded-lg p-3 text-[11.5px] leading-relaxed text-zinc-700 whitespace-pre-line">
            {WAIVER_TEXT}
          </div>
        )}
      </div>

      {/* 2. Public holidays */}
      {showHolidays && (
        <label className="flex gap-2.5 items-start text-sm text-zinc-800">
          <input type="checkbox" checked={value.publicHolidays} onChange={(e) => set('publicHolidays', e.target.checked)} className="mt-1 w-4 h-4 accent-[#D72027] shrink-0" />
          <span>I understand circus classes continue as usual on public holidays, are charged as part of the regular schedule, and are not counted as a missed class. *</span>
        </label>
      )}

      {/* 3. Media consent */}
      <div>
        <div className="text-sm font-bold text-zinc-800 mb-1.5">Do you consent to BigStar Circus using photos and/or videos of your child for promotional use? *</div>
        <div className="flex gap-4 flex-wrap">
          {(['yes', 'no', 'unsure'] as const).map((v) => (
            <label key={v} className="flex items-center gap-1.5 text-sm text-zinc-700">
              <input type="radio" name="consentPhoto" checked={value.consentPhoto === v} onChange={() => set('consentPhoto', v)} className="w-4 h-4 accent-[#D72027]" />
              {v === 'yes' ? 'Yes' : v === 'no' ? 'No' : 'Unsure'}
            </label>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 mt-1">Choosing “No” never affects your child’s place in class.</p>
      </div>

      {/* 4. Name + signature */}
      <div>
        <label className="text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1 block">Name of parent / legal guardian *</label>
        <input className={inp} value={value.signerName} onChange={(e) => set('signerName', e.target.value)} placeholder="Full name" />
      </div>
      <SignaturePad value={value.signature} onChange={(s) => set('signature', s)} />
    </div>
  )
}
