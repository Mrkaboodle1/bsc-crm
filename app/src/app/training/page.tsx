// /training — onboarding portal for new BSC staff.
// Modeled on Tectonic's Training & Support page: hero banner, "Start
// Training" walkthrough of 11 modules, Submit Ticket form, Quick Start
// checklist. Each module's text can be read aloud by Jacky's voice
// (browser SpeechSynthesis API).

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { TRAINING_MODULES } from './modules'
import { TrainingPortal } from './training-portal'

export default async function TrainingPage() {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath="/training"
      pageTitle="Training & Support"
      pageSubtitle="Everything a new BSC team member needs to learn the CRM. Watch, read, listen, and try."
    >
      <TrainingPortal modules={TRAINING_MODULES} userName={user.fullName?.split(' ')[0] ?? null} />
    </DashboardShell>
  )
}
