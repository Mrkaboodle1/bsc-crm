// Reusable "coming soon" panel for routes we've stubbed but not yet built.
// Lets navigation feel complete even before every slice lands.

export function ComingSoon({
  icon = '🎪',
  slice,
  title,
  description,
  bullets,
}: {
  icon?: string
  slice: string
  title: string
  description: string
  bullets?: string[]
}) {
  return (
    <div className="max-w-3xl">
      <div className="bg-white rounded-2xl shadow-md border-l-8 border-[#FFC107] p-8">
        <div className="flex items-start gap-4 mb-4">
          <span className="text-5xl">{icon}</span>
          <div>
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-[#D72027] mb-1">
              {slice}
            </div>
            <h2 className="text-2xl font-extrabold text-zinc-900 leading-tight">{title}</h2>
            <p className="text-zinc-600 mt-2">{description}</p>
          </div>
        </div>

        {bullets && bullets.length > 0 && (
          <ul className="space-y-2 mt-6 pt-6 border-t border-zinc-100">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-3 text-sm text-zinc-700">
                <span className="text-[#D72027] font-extrabold">›</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-zinc-500 mt-4 px-2">
        Sidebar nav is live so we can ship slices incrementally. Each section
        unlocks once its slice ships.
      </p>
    </div>
  )
}
