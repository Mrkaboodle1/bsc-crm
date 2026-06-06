import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/surveys"
      pageTitle="Surveys"
      pageSubtitle="Ask parents for feedback and reviews."
      icon="🗳️"
      slice="Marketing · Coming soon"
      title="Surveys"
      description="Send quick surveys to gather parent feedback — end-of-term reviews, class satisfaction, NPS. Happy responders can be nudged to leave a Google review; unhappy ones get a private follow-up."
      bullets={[
        'End-of-term + satisfaction surveys',
        'Star ratings and open comments',
        'Auto-ask happy families for a Google review',
        'Results tracked against each contact',
      ]}
    />
  )
}
