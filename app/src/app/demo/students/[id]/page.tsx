import { notFound } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard-shell'
import { StudentProfileView, type StudentProfile } from '@/components/student-profile-view'
import { demoUser, demoStudents, demoFamilies, demoLedger } from '@/lib/demo-data'

export default async function DemoStudentProfile({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const s = demoStudents.find((x) => x.id === id)
  if (!s) notFound()
  const fam = demoFamilies.find((f) => f.id === s.familyId) ?? null

  // Pull ledger entries that mention this student name
  const fullName = `${s.firstName} ${s.lastName}`.trim()
  const ledger = demoLedger
    .filter((l) => l.student.startsWith(s.firstName))
    .map((l, i) => ({
      id: l.id + '-' + i,
      stars: l.stars,
      reason: l.reason,
      notes: l.notes,
      awardedAt: l.date + 'T16:30:00+10:00',
      coachName: l.coach,
    }))

  const profile: StudentProfile = {
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    age: s.age,
    dob: null,
    medical: s.medical,
    photoConsent: true,
    photoConsentDate: '2026-01-21',
    blueCardNumber: null,
    blueCardExpiry: null,
    totalStars: s.totalStars,
    starTier: s.starTier,
    traineeStatus: s.traineeStatus,
    family: fam
      ? {
          id: fam.id,
          name: fam.name,
          parent: fam.primaryParent,
          email: fam.email,
          phone: fam.phone,
          lifecycle: fam.lifecycle,
        }
      : null,
    ledger,
    enrolments: [
      { id: 'e1', startDate: '2026-04-21', endDate: null, status: 'active', weeklyFee: 27, term: 'Term 2 2026', className: 'Wed 10:30 Homeschool Circus', classId: 'c-wed-2', discipline: 'homeschool' },
    ],
    attendance: [
      { id: 'a1', date: '2026-05-12', status: 'present', stars: 1, notes: null, className: 'Wed 10:30 Homeschool Circus' },
      { id: 'a2', date: '2026-05-05', status: 'present', stars: 0, notes: null, className: 'Wed 10:30 Homeschool Circus' },
      { id: 'a3', date: '2026-04-28', status: 'late',    stars: 0, notes: null, className: 'Wed 10:30 Homeschool Circus' },
      { id: 'a4', date: '2026-04-21', status: 'present', stars: 2, notes: 'First cartwheel without help', className: 'Wed 10:30 Homeschool Circus' },
    ],
  }

  return (
    <DashboardShell
      user={demoUser}
      currentPath="/students"
      pageTitle={fullName}
      pageSubtitle={`${s.age} years old · Tier ${s.starTier} · ${s.totalStars} stars · (Demo mode)`}
      pageActions={
        <a
          href="/demo/students"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← All students
        </a>
      }
    >
      <StudentProfileView profile={profile} />
    </DashboardShell>
  )
}
