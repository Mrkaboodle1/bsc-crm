import { StubPage } from '@/lib/stub-page'

export default async function ConversationsPage() {
  return (
    <StubPage
      currentPath="/conversations"
      pageTitle="Conversations"
      pageSubtitle="One inbox for email, SMS, Instagram DM, Facebook."
      icon="💬"
      slice="Slice 5 · Soon"
      title="One inbox for every channel"
      description="Replaces Tectonic's Conversations. Email, SMS, IG DM, Messenger — all threaded against the family record so you never lose context."
      bullets={[
        'Resend for transactional + reply-tracked email',
        'ClickSend for Australian SMS (4¢ outbound)',
        'Instagram + Facebook DM via Meta Graph (already connected)',
        'Auto-thread by phone number / email match to a family',
        'Tag conversations: trial enquiry, booking, complaint, NDIS',
      ]}
    />
  )
}
