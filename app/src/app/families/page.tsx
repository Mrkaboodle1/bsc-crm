import { StubPage } from '@/lib/stub-page'

export default async function FamiliesPage() {
  return (
    <StubPage
      currentPath="/families"
      pageTitle="Families"
      pageSubtitle="The household / billing record — one per primary parent."
      icon="👨‍👩‍👧"
      slice="Slice 1.5 · Soon"
      title="Family records — the billing root"
      description="One row per household. Holds primary parent, all kids, billing details, lifecycle stage (lead → trial → active → past), Stripe customer ID, and weekly fee total."
      bullets={[
        'Lifecycle: lead, trial, active, paused, past, lost',
        'Source tracking: FB ad, IG, Google, word of mouth, school, walk-in',
        'Linked students rolled up — see all kids in one card',
        'Tag-based segmentation — NDIS, holiday programme, party-only, etc.',
      ]}
    />
  )
}
