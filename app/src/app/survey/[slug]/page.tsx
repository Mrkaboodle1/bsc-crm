import { SurveyRunner } from '@/components/survey-runner'

const TITLES: Record<string, string> = {
  'term-feedback': 'How was this term?',
  'class-feedback': 'How are we going?',
}

export default async function PublicSurveyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] px-6 py-5 text-white text-center">
          <div className="text-3xl mb-1">🎪</div>
          <h1 className="text-xl font-extrabold">{TITLES[slug] ?? 'Your feedback'}</h1>
          <p className="text-xs text-amber-100 mt-0.5">Big Star Circus · takes 20 seconds</p>
        </div>
        <div className="p-6"><SurveyRunner slug={slug} /></div>
      </div>
    </div>
  )
}
