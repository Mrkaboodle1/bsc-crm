import { StubPage } from '@/lib/stub-page'

export default async function SettingsPage() {
  return (
    <StubPage
      currentPath="/settings"
      pageTitle="Settings"
      pageSubtitle="Tenant brand, users, integrations, billing."
      icon="⚙️"
      slice="Slice 1+ · Soon"
      title="Settings"
      description="Tenant-level config that doesn't fit anywhere else. The owner role can edit, others can read."
      bullets={[
        'Tenant brand: logo, colours, footer, ABN, address',
        'Users: invite, remove, set role (owner / manager / coach / parent / support)',
        'Integrations: Stripe, Square, Resend, ClickSend, Meta, Google',
        'Billing: your subscription tier (founder / starter / pro / enterprise)',
        'Audit log — who did what, when',
      ]}
    />
  )
}
