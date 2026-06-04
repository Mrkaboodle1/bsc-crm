import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { GamesLibrary } from '@/components/games-library'
import gamesData from '@/data/games.json'

// /games — BSC HQ Games Library. Coaches search/filter games and mark which
// they've played this week (resets Monday) so they don't repeat one.
// Source of truth: BSC_HQ/Knowledge_Base/Games_Library/Games_Master_Database.json
// (synced here via build-games-library.mjs).

export default async function GamesPage() {
  const user = await verifySession()
  const games = gamesData.games

  return (
    <DashboardShell
      user={user}
      currentPath="/games"
      pageTitle="Games Library"
      pageSubtitle={`${games.length} games — pick one for the week, don't repeat it`}
    >
      <GamesLibrary games={games} />
    </DashboardShell>
  )
}
