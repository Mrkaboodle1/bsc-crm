import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/domains"
      pageTitle="Domains"
      pageSubtitle="Connect your web addresses (e.g. bigstarcircus.com.au)."
      icon="🌐"
      slice="Marketing · Coming soon"
      title="Domains"
      description="Connect and manage your web addresses in one place — your main bigstarcircus.com.au site, plus any landing-page or campaign domains. Jacky handles the technical setup; you just see what's connected and where it points."
      bullets={[
        'Connect bigstarcircus.com.au + campaign domains',
        'See which site/funnel each domain points to',
        'Status at a glance (connected / pending)',
        'Jacky does the technical setup for you',
      ]}
    />
  )
}
