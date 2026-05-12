import { StubPage } from '@/lib/stub-page'

export default async function LeadsPage() {
  return (
    <StubPage
      currentPath="/leads"
      pageTitle="Leads"
      pageSubtitle="Trial enquiries and new-family pipeline."
      icon="🎯"
      slice="Slice 5 · Soon"
      title="Lead pipeline"
      description="Replaces Tectonic Opportunities. Every new-family enquiry from website, FB ad, IG DM or walk-in lands here. Auto-emails a welcome pack and tracks them through trial → enrolled."
      bullets={[
        'Pipeline stages: new → contacted → trial booked → trialled → enrolled / lost',
        'Auto welcome email (Resend) on lead creation',
        'Auto SMS reminder 24h before trial (ClickSend)',
        'Source attribution — see which channel converts',
      ]}
    />
  )
}
