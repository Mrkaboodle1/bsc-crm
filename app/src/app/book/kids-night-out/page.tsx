import { getPublicKno } from '@/lib/workshops'
import { getPublicWaiver } from '@/lib/waivers'
import { WorkshopBooking } from '@/components/workshop-booking'

export const dynamic = 'force-dynamic'

export default async function BookKidsNightOutPage() {
  const { businessName, workshops } = await getPublicKno()
  const waiver = await getPublicWaiver()
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🌙</div>
          <h1 className="text-3xl font-extrabold text-zinc-900">Kids Night Out — Disco Party</h1>
          <p className="text-zinc-600 mt-1">Need a sitter for date night? We've got the best! 🎉</p>
          <p className="text-sm text-zinc-600 mt-3 max-w-lg mx-auto">
            Drop the kids with us for a night of dancing, circus games, pizza, prizes & a movie to wind down.
            <strong> FREE for members</strong> · $60 per child for non-members. Payment secures the spot and is non-refundable.
          </p>
          <div className="text-xs text-zinc-500 mt-3 bg-white/70 rounded-xl p-3 max-w-md mx-auto text-left">
            <strong>What's included:</strong> disco + bubble party · circus, aerial & bungee fun · games ·
            pizza & popcorn · a wind-down movie. <br />
            <strong>Bring:</strong> comfy clothes, a named water bottle, any medications.
          </div>
        </div>
        <WorkshopBooking workshops={workshops} kind="kno" paymentUrl="https://buy.stripe.com/28E4gzel98dC2Q9bbrf7i0x" waiver={waiver} />
        <p className="text-center text-xs text-zinc-400 mt-8">{businessName} · Unit 1/14 Harper St, Molendinar · 0489 188 179</p>
      </div>
    </div>
  )
}
