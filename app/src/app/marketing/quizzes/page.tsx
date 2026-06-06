import { StubPage } from '@/lib/stub-page'

export default function Page() {
  return (
    <StubPage
      currentPath="/marketing/quizzes"
      pageTitle="Quizzes"
      pageSubtitle="Fun quizzes that capture leads — 'Which class suits my child?'"
      icon="❓"
      slice="Marketing · Coming soon"
      title="Quizzes"
      description="Interactive quizzes that engage parents and capture leads — e.g. 'Which Big Star class is right for my child?'. The result recommends a class and adds them as a lead, tagged with their answers."
      bullets={[
        '“Which class suits my child?” style quizzes',
        'Recommends the right class at the end',
        'Captures the parent as a tagged lead',
        'Share on social or embed on the website',
      ]}
    />
  )
}
