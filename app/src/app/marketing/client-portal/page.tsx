import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/client-portal"
      pageTitle="Client Portal"
      pageSubtitle="A login for parents — bookings, payments, progress."
      icon="👨‍👩‍👧"
      slice="Marketing · Coming soon"
      title="Parent / Client portal"
      description="A private login where families manage everything themselves — view bookings, pay invoices, update details, see their child's progress and rewards. Ties into the BigStar parent-portal vision."
      bullets={[
        'Parents view their classes + bookings',
        'Pay invoices and manage payment details',
        'See their child’s stars and progress',
        'Update contact details themselves',
      ]}
    />
  )
}
