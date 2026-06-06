import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/blog"
      pageTitle="Blog"
      pageSubtitle="Publish articles to your website — great for Google."
      icon="✍️"
      slice="Marketing · Coming soon"
      title="Blog"
      description="Write and publish articles on the Big Star website — class tips, student spotlights, event recaps. Helps your Google ranking and gives families a reason to keep visiting. Jacky can draft posts for you."
      bullets={[
        'Write or have Jacky draft posts',
        'Publishes to your website',
        'Better Google ranking (SEO)',
        'Share straight to social',
      ]}
    />
  )
}
