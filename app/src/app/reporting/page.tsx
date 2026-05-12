import { StubPage } from '@/lib/stub-page'

export default async function ReportingPage() {
  return (
    <StubPage
      currentPath="/reporting"
      pageTitle="Reporting"
      pageSubtitle="The numbers that actually run the business."
      icon="📈"
      slice="Slice 4+ · Soon"
      title="Reports that matter"
      description="Replaces Tectonic Reporting. Built around the metrics Rhett actually needs to grow BSC — not the generic CRM dashboards."
      bullets={[
        'Weekly enrolled-student count by class + discipline',
        'Trial → enrolled conversion rate by source (FB / IG / Google / WoM)',
        'Average revenue per family + LTV trend',
        'Coach hours + pay-run summary',
        'NDIS plan-managed vs self-managed split',
        'Year-Round Membership churn vs hold rate',
      ]}
    />
  )
}
