// /media — the image library landing page. Renders an embedded MediaPicker
// in inline mode so the user can upload, generate, search, and delete.

import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { MediaLibraryClient } from './media-library-client'

export default async function MediaPage() {
  const user = await verifySession()
  return (
    <DashboardShell
      user={user}
      currentPath="/media"
      pageTitle="Media library"
      pageSubtitle="Every image you've uploaded or generated — used by the Sites builder."
    >
      <MediaLibraryClient />
    </DashboardShell>
  )
}
