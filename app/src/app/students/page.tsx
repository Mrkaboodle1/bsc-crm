import { StubPage } from '@/lib/stub-page'

export default async function StudentsPage() {
  return (
    <StubPage
      currentPath="/students"
      pageTitle="Students"
      pageSubtitle="Every kid we coach — with their star tier and enrolments."
      icon="🧒"
      slice="Slice 1.5 · Soon"
      title="Student profiles"
      description="Each kid has a card with photo, age, medical notes, blue-card status (if 14+), photo consent, current enrolments, total stars and star tier (Spark → BigStar Trainee)."
      bullets={[
        'Star tier badge: 1 Spark / 2 Shining / 3 Rising / 4 Star / 5 BigStar Trainee',
        'Auto-recalculated whenever stars are awarded in Roll Call',
        'Medical + allergy field surfaces in Roll Call as an icon next to their tile',
        'Photo consent + blue card expiry tracked + alerted',
      ]}
    />
  )
}
