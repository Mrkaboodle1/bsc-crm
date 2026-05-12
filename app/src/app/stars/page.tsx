import { StubPage } from '@/lib/stub-page'

export default async function StarsPage() {
  return (
    <StubPage
      currentPath="/stars"
      pageTitle="Star Ledger"
      pageSubtitle="The reward system that earns it the killer-feature label."
      icon="⭐"
      slice="Slice 3 · Soon"
      title="Star Ledger — 5-tier progression"
      description="Every star awarded in Roll Call is logged with the reason, the coach, and the date. Tier auto-recalculates. When a student levels up, their parent gets notified."
      bullets={[
        'Tier 1 Spark (0–5 stars) → 5 Shining → 15 Rising → 35 Star → 75+ BigStar Trainee',
        'Per-student timeline of every star earned',
        'Auto SMS/email to parent when a kid levels up',
        'Coach leaderboard — who awards the most stars per week',
        'Term-end star count → printed certificate template',
      ]}
    />
  )
}
