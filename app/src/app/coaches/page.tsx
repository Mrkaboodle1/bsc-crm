import { StubPage } from '@/lib/stub-page'

export default async function CoachesPage() {
  return (
    <StubPage
      currentPath="/coaches"
      pageTitle="Coaches"
      pageSubtitle="Roster, blue cards, first aid, pay rates."
      icon="🤝"
      slice="Slice 1.5 · Soon"
      title="Coach roster"
      description="Every coach with their skills tag-set, blue-card expiry, first-aid expiry, Gymnastics Australia accreditation, employment type and pay rate. Alerts before anything expires."
      bullets={[
        'Roles: head / adult / trainee / casual',
        'Skills: acro, aerial, juggling, drama, gymnastics, balloon, clowning',
        'Blue card + first aid expiry alerts (60 / 30 / 7 days)',
        'Weekly pay-run summary based on classes coached',
      ]}
    />
  )
}
