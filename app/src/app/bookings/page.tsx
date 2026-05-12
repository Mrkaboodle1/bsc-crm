import { StubPage } from '@/lib/stub-page'

export default async function BookingsPage() {
  return (
    <StubPage
      currentPath="/bookings"
      pageTitle="Bookings"
      pageSubtitle="Birthday parties, KNO nights, workshops, holiday programmes."
      icon="🎉"
      slice="Slice 6 · Soon"
      title="One-off bookings"
      description="Anything that isn't a recurring weekly class: parties, Kids' Night Out, holiday-programme days, school workshops, corporate gigs."
      bullets={[
        'Public booking form embeddable on bigstarcircus.com.au',
        'Stripe Checkout deposit on submission',
        'Auto calendar block + coach assignment',
        'Reminder emails + day-before SMS to parent',
        'Post-event review request (drives Reputation score)',
      ]}
    />
  )
}
