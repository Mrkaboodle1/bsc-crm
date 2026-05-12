export default function AwaitingAccessPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-amber-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center">
        <div className="text-6xl mb-4">🎪</div>
        <h1 className="text-3xl font-extrabold text-zinc-900 mb-3">Almost there</h1>
        <p className="text-zinc-600 mb-6">
          You&apos;re signed in, but your email hasn&apos;t been linked to a Big Star
          Circus account yet. An owner needs to invite you in.
        </p>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className="inline-block bg-gradient-to-r from-[#D72027] to-[#A0151B] text-white font-extrabold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl"
          >
            Sign out
          </button>
        </form>
        <p className="text-xs text-zinc-400 mt-8">
          Owners: invite this user via the Users page (Slice 5, coming soon).
        </p>
      </div>
    </div>
  )
}
