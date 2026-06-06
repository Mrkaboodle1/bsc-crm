import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/webinars"
      pageTitle="Webinars"
      pageSubtitle="Run online info sessions, parent nights and trainings."
      icon="🎥"
      slice="Marketing · Coming soon"
      title="Webinars & online events"
      description="Host live or recorded online sessions — new-parent info nights, holiday-programme previews, coach trainings. Registrations become contacts and attendees can be followed up automatically."
      bullets={[
        'Registration page with auto-reminders',
        'Live or pre-recorded sessions',
        'Attendees added to Contacts + tagged',
        'Follow-up email sequence after the event',
      ]}
    />
  )
}
