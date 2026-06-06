import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/forms"
      pageTitle="Forms"
      pageSubtitle="Enrolment, enquiry, waiver and consent forms."
      icon="📝"
      slice="Marketing · Coming soon"
      title="Forms"
      description="Build forms for enrolment, trial enquiries, waivers and media consent. Every submission lands in your Chat inbox and creates/updates a contact automatically — no more paper or lost emails."
      bullets={[
        'Enrolment + trial enquiry forms',
        'Waivers and media consent',
        'Submissions create/update a contact',
        'Embed on your website or share a link',
      ]}
    />
  )
}
