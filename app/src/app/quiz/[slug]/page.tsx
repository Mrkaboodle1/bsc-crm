import { QuizRunner } from '@/components/quiz-runner'

export default async function PublicQuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-red-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
        <div className="bg-gradient-to-r from-[#D72027] to-[#A0151B] px-6 py-5 text-white text-center">
          <div className="text-3xl mb-1">🎪</div>
          <h1 className="text-xl font-extrabold">Which class suits my child?</h1>
          <p className="text-xs text-amber-100 mt-0.5">Big Star Circus · 30-second quiz</p>
        </div>
        <div className="p-6"><QuizRunner slug={slug} /></div>
      </div>
    </div>
  )
}
