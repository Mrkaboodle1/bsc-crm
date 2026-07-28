'use client'

import { useState } from 'react'
import { Mail, Copy, Check } from 'lucide-react'

// Generates the venue enquiry email — with the questions that actually decide
// whether we can run circus there (ceiling height and rigging above all).
export function VenueEnquiry({ venue, suburb }: { venue: Record<string, any>; suburb: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const who = venue.contact_name ? `Hi ${String(venue.contact_name).split(' ')[0]},` : 'Hello,'
  const body = `${who}

I'm Rhett Morrow from BigStar Circus — we run circus, acrobatics and aerial classes for children on the Gold Coast (bigstarcircus.com.au). We're looking at running a weekly children's program in ${suburb} and ${venue.name} looks like a great fit.

Could I please ask a few questions about hiring the space?

1. What are your hire rates? Do you have a not-for-profit or community rate as well as the casual rate?
2. What's the approximate floor size, and what is the CEILING HEIGHT? (This one matters most for us — aerial equipment needs height.)
3. What's the floor surface? (timber / sprung / vinyl / carpet / concrete)
4. Is there anything overhead we could safely rig from, or would we bring a freestanding rig?
5. What weekday afternoon availability do you have (roughly 3:30–6:30pm), and Saturday mornings?
6. Is there any storage where we could leave mats and equipment between sessions?
7. What public liability cover do you require? We carry our own and can send our certificate of currency.
8. Is there a minimum booking period or a bond?
9. Are there any noise restrictions or other groups using the space at those times?

We're a child-safe organisation — all our coaches hold current Blue Cards and first aid, and we carry full public liability insurance. Happy to send through anything you need.

Would it also be possible to arrange a short site visit?

Thanks so much for your time.

Rhett Morrow
BigStar Circus
0489 188 179
admin@bigstarcircus.com.au
bigstarcircus.com.au`

  const subject = `Hall hire enquiry — children's circus classes (BigStar Circus)`
  const mailto = `mailto:${venue.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#D72027] hover:underline">
        <Mail size={13} /> {open ? 'Hide' : 'Write'} enquiry email
      </button>
      {open && (
        <div className="mt-2 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
          <div className="flex gap-2 mb-2 flex-wrap">
            <button
              onClick={() => { navigator.clipboard.writeText(body).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800) }) }}
              className="inline-flex items-center gap-1.5 bg-zinc-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
              {copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy text</>}
            </button>
            {venue.email && (
              <a href={mailto} className="inline-flex items-center gap-1.5 bg-[#D72027] text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                <Mail size={13} /> Open in email
              </a>
            )}
            {venue.phone && <span className="text-xs text-zinc-500 self-center">or call {venue.phone}</span>}
          </div>
          <pre className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-zinc-700 max-h-60 overflow-y-auto">{body}</pre>
        </div>
      )}
    </div>
  )
}
