import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'

// /games — coaches pick a game for the week and log it so they don't repeat
// one within the same week. Awaiting Rhett's games list (name, how to play,
// rules) before the library + weekly tracker go live.

export default async function GamesPage() {
  const user = await verifySession()

  return (
    <DashboardShell
      user={user}
      currentPath="/games"
      pageTitle="Games"
      pageSubtitle="Pick a game for the week — and don't repeat it in the same week"
    >
      <div className="bg-white rounded-2xl border border-zinc-200 p-8 max-w-2xl">
        <div className="text-4xl mb-3">🎲</div>
        <h2 className="text-xl font-extrabold text-zinc-900 mb-2">Games library is coming</h2>
        <p className="text-sm text-zinc-600 mb-4">Here&apos;s how it will work once the list is in:</p>
        <ul className="space-y-2 text-sm text-zinc-700">
          <li className="flex gap-2"><span>1.</span> Browse the full list of games with <strong>how to play</strong> + <strong>rules</strong>.</li>
          <li className="flex gap-2"><span>2.</span> Pick one for your class and tap <strong>&ldquo;Played this week&rdquo;</strong>.</li>
          <li className="flex gap-2"><span>3.</span> Anything you&apos;ve already run this week is greyed out, so you <strong>never repeat a game</strong> in the same week.</li>
          <li className="flex gap-2"><span>4.</span> The week resets every Monday.</li>
        </ul>
        <div className="mt-5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          🎪 <strong>Rhett</strong> — send Jacky your games list (each game + how to play + rules) and this fills right up.
        </div>
      </div>
    </DashboardShell>
  )
}
