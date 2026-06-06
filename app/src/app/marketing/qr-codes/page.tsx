import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { QrTool } from '@/components/qr-tool'

export default async function QrCodesPage() {
  const user = await verifySession()
  return (
    <DashboardShell user={user} currentPath="/marketing/qr-codes" pageTitle="QR Codes" pageSubtitle="Make a scannable code for flyers, posters and shows.">
      <QrTool />
    </DashboardShell>
  )
}
