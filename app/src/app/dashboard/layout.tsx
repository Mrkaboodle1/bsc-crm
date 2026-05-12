// Layout for /dashboard — we let each page render the shell so they can
// supply their own title + actions. So this layout just verifies the session
// once for the segment.
import { verifySession } from '@/lib/dal'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await verifySession()
  return <>{children}</>
}
