import { StubPage } from '@/lib/stub-page'

export default async function ClassesPage() {
  return (
    <StubPage
      currentPath="/classes"
      pageTitle="Classes"
      pageSubtitle="Every recurring weekly class — Mon to Sat."
      icon="🎪"
      slice="Slice 1.5 · Soon"
      title="Class catalogue"
      description="All 18 weekly classes — discipline, age band, capacity, fee, primary coach. Open any class to see the roster and recent attendance."
      bullets={[
        'Disciplines: circus acro, aerial, fusion, drama, toddler, homeschool, adult, NDIS',
        'Capacity vs enrolled — visual fill bar to spot full / underfilled classes',
        'Coach assignment + cover-coach roster',
        'Fee tiers ($20 toddler / $27 standard / $30 adult)',
      ]}
    />
  )
}
