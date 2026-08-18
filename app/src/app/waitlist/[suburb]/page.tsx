import { notFound } from 'next/navigation'
import { WaitlistForm } from '@/components/public/waitlist-form'

export const dynamic = 'force-dynamic'

// Public landing pages for the satellite Facebook ads:
//   /waitlist/ormeau, /waitlist/upper-coomera, …
// Video at the top (drop the file in when Rhett's shot it), waitlist form
// underneath, every click and every form-fill logged back to the CRM.

const SUBURBS: Record<string, { label: string; centre: string; line: string }> = {
  'ormeau':          { label: 'Ormeau',          centre: 'Ormeau Community Centre',          line: 'Nearly 3,000 primary-aged kids in Ormeau — and until now, no circus school.' },
  'upper-coomera':   { label: 'Upper Coomera',   centre: 'Upper Coomera Centre',             line: 'Right on Reserve Road — the same street as the college.' },
  'pacific-pines':   { label: 'Pacific Pines',   centre: 'Pacific Pines Community Centre',   line: 'A real circus school, finally in the Pines.' },
  'burleigh-waters': { label: 'Burleigh Waters', centre: 'Burleigh Waters Community Centre', line: 'Aerials, acro and circus skills — southern Gold Coast, this is yours.' },
  'palm-beach':      { label: 'Palm Beach',      centre: 'Palm Beach Community Centre',      line: 'A real circus school, coming to the beach end of town.' },
  'runaway-bay':     { label: 'Runaway Bay',     centre: 'Runaway Bay Community Centre',     line: 'Circus is landing at the Bay.' },
}

export default async function WaitlistPage({ params }: { params: Promise<{ suburb: string }> }) {
  const { suburb } = await params
  const info = SUBURBS[suburb]
  if (!info) notFound()

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#14213d] via-[#1d2b52] to-[#14213d] text-white">
      {/* big-top bunting stripe */}
      <div className="h-2 bg-[repeating-linear-gradient(90deg,#D72027_0,#D72027_24px,#FFC107_24px,#FFC107_48px)]" />
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* header — logo front and centre */}
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bigstar-logo.png" alt="BigStar Circus" className="h-20 sm:h-24 mx-auto mb-3 drop-shadow-[0_4px_12px_rgba(255,193,7,0.35)]" />
          <div className="text-[11px] font-black uppercase tracking-[0.28em] text-[#FFC107]">⭐ The Gold Coast&rsquo;s circus school ⭐</div>
          <h1 className="text-3xl sm:text-4xl font-black mt-2 leading-tight">
            Circus is coming to<br /><span className="text-[#FFC107]">{info.label}</span> 🎪
          </h1>
          <p className="text-sm text-blue-100 mt-3 font-bold">{info.line}</p>
          <div className="mt-3 inline-block bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white text-[11px] font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg ring-2 ring-[#FFC107]/60">
            🎁 Founding-family perks · first 30 only
          </div>
        </div>

        {/* video slot — drop the real file at /public/waitlist-promo.mp4 and it plays */}
        <div className="rounded-2xl overflow-hidden border-2 border-white/20 mb-6 bg-black/40">
          <video
            className="w-full aspect-video object-cover"
            controls
            playsInline
            preload="metadata"
            poster="/waitlist-poster.jpg"
          >
            <source src="/waitlist-promo.mp4" type="video/mp4" />
          </video>
          <div className="px-4 py-2.5 text-[11px] text-blue-200 bg-white/5">
            ▶ Aerial silks · acro tumbling · juggling — one class, all circus. Ages 5–15 at {info.centre}.
          </div>
        </div>

        {/* the pitch, three fast points */}
        <div className="grid grid-cols-3 gap-2 text-center mb-6">
          <div className="bg-white/10 rounded-xl px-2 py-3"><div className="text-xl font-black text-[#FFC107]">75</div><div className="text-[10px] font-bold text-blue-100">kids a week at our Gold Coast school</div></div>
          <div className="bg-white/10 rounded-xl px-2 py-3"><div className="text-xl font-black text-[#FFC107]">$30</div><div className="text-[10px] font-bold text-blue-100">a week — no contracts ever</div></div>
          <div className="bg-white/10 rounded-xl px-2 py-3"><div className="text-xl font-black text-[#FFC107]">1st</div><div className="text-[10px] font-bold text-blue-100">pick of class times for waitlist families</div></div>
        </div>

        {/* the form */}
        <div className="bg-white rounded-3xl p-5 text-zinc-900 shadow-2xl">
          <div className="text-center mb-4">
            <div className="text-lg font-black">Join the {info.label} waitlist</div>
            <div className="text-xs text-zinc-500 font-bold mt-1">Free to join · first 30 families get founding perks 🎁</div>
          </div>
          <WaitlistForm suburb={suburb} suburbLabel={info.label} />
        </div>

        <div className="text-center text-[11px] text-blue-200 mt-6">
          BigStar Circus · Unit 1/14 Harper St, Molendinar · 0489 188 179 · bigstarcircus.com.au
        </div>
      </div>
    </div>
  )
}
