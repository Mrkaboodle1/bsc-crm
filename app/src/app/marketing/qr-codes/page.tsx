import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { QrTool } from '@/components/qr-tool'

export default async function QrCodesPage() {
  const user = await verifySession()
  const t = user.tenant
  const presets = [
    t?.website && { label: 'Website', url: t.website },
    t?.website && { label: 'Free trial form', url: `${t.website.replace(/\/$/, '')}/free-trial` },
    t?.socials?.facebook && { label: 'Facebook', url: t.socials.facebook },
    t?.socials?.instagram && { label: 'Instagram', url: t.socials.instagram },
    t?.socials?.youtube && { label: 'YouTube', url: t.socials.youtube },
    t?.socials?.tiktok && { label: 'TikTok', url: t.socials.tiktok },
  ].filter(Boolean) as { label: string; url: string }[]
  return (
    <DashboardShell user={user} currentPath="/marketing/qr-codes" pageTitle="QR Codes" pageSubtitle="Make a scannable code for flyers, posters and shows.">
      <QrTool presets={presets} defaultUrl={t?.website || ''} filePrefix={(t?.slug || 'qr')} />
    </DashboardShell>
  )
}
