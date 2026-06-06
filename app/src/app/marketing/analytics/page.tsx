import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/analytics"
      pageTitle="Analytics"
      pageSubtitle="See what's working — visitors, leads and where they come from."
      icon="📊"
      slice="Marketing · Coming soon"
      title="Marketing analytics"
      description="One dashboard for your funnel: website visitors, form submissions, lead sources (Google, Facebook, word of mouth), trial-to-paying conversion, and which campaigns bring the best families."
      bullets={[
        'Website visitors + traffic sources',
        'Leads by source and over time',
        'Trial → paying conversion rate',
        'Best-performing posts and campaigns',
      ]}
    />
  )
}
