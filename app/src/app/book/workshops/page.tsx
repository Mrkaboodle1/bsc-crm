import { getPublicWorkshops } from '@/lib/workshops'
import { getPublicWaiver } from '@/lib/waivers'
import { WorkshopBooking } from '@/components/workshop-booking'

export const dynamic = 'force-dynamic'

export default async function BookWorkshopsPage() {
  const { businessName, workshops } = await getPublicWorkshops()
  const waiver = await getPublicWaiver()
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🏕️</div>
          <h1 className="text-3xl font-extrabold text-zinc-900">School Holiday Workshops</h1>
          <p className="text-zinc-600 mt-1">A full day of circus fun — 9am to 3pm.</p>
          <p className="text-xs text-zinc-500 mt-2 max-w-lg mx-auto">Members book first each term and get their member rate <strong>on their regular class day</strong>. A different day is $60. Once member booking closes, spots open to everyone — so book early! Payment secures the spot and is non-refundable.</p>
        </div>
        <WorkshopBooking workshops={workshops} kind="workshop" paymentUrl="https://buy.stripe.com/3cIcN50ujctSduNgvLf7i0w" waiver={waiver} />
        <p className="text-center text-xs text-zinc-400 mt-8">{businessName}</p>
      </div>
    </div>
  )
}
