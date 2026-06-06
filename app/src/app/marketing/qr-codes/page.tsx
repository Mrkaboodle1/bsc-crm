import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/qr-codes"
      pageTitle="QR Codes"
      pageSubtitle="Printable codes for flyers, posters and shows."
      icon="🔳"
      slice="Marketing · Coming soon"
      title="QR codes"
      description="Generate QR codes for flyers, posters, show banners and business cards. Point them at your trial-booking form, website or a class page — and track how many scans each one gets."
      bullets={[
        'Codes for flyers, posters, show banners',
        'Point at booking forms or your website',
        'Track scans per code',
        'Download print-ready images',
      ]}
    />
  )
}
