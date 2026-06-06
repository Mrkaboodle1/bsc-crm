import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/store"
      pageTitle="Store"
      pageSubtitle="Sell class passes, tickets, merch and gift cards online."
      icon="🛍️"
      slice="Marketing · Coming soon"
      title="Your online store"
      description="A simple shop so parents can buy directly — term passes, casual class tickets, holiday-workshop spots, show tickets, BSC merch and gift cards. Payments flow into Finance and the buyer becomes a contact automatically."
      bullets={[
        'Sell class passes, workshop spots and show tickets',
        'Merch + gift cards',
        'Card payments via Stripe (already connected)',
        'Buyer auto-added to Contacts with the purchase tagged',
      ]}
    />
  )
}
