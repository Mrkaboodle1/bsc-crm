import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { BlogWriter } from '@/components/blog-writer'

export default async function BlogPage() {
  const user = await verifySession()
  return (
    <DashboardShell user={user} currentPath="/marketing/blog" pageTitle="Blog" pageSubtitle="Write blog posts in seconds with Jacky — great for Google & socials.">
      <BlogWriter />
    </DashboardShell>
  )
}
