import { Storefront } from '@/components/storefront'

export default function ShopPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎪</div>
          <h1 className="text-3xl font-extrabold text-zinc-900">Big Star Circus Shop</h1>
          <p className="text-zinc-600 mt-1">Class passes, workshops, show tickets & merch.</p>
        </div>
        <Storefront />
        <p className="text-center text-xs text-zinc-400 mt-8">Big Star Circus · Molendinar, Gold Coast · bigstarcircus.com.au</p>
      </div>
    </div>
  )
}
