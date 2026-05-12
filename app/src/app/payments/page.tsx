import { StubPage } from '@/lib/stub-page'

export default async function PaymentsPage() {
  return (
    <StubPage
      currentPath="/payments"
      pageTitle="Payments"
      pageSubtitle="Stripe + Square sync. Subscriptions, failed-payment recovery."
      icon="💳"
      slice="Slice 4 · Soon"
      title="Live billing state"
      description="Replaces Tectonic Payments. Reads Stripe + Square webhooks so every family card shows real-time subscription state. Failed payments auto-recover via SMS dunning sequence."
      bullets={[
        'Stripe Billing — weekly recurring subscriptions per enrolment',
        'Square sync — for over-the-counter party deposits',
        'Year-Round Membership rollout: hold-fee → reactivate',
        'Failed-payment dunning: SMS 1 → SMS 3 → call task',
        'AUS GST handled correctly (BSC is registered)',
      ]}
    />
  )
}
