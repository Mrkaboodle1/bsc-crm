import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'

// /protocols — coaches can read the current coach protocols any time and see
// when something changes. Content to be loaded from operations SOPs / Rhett.

const PROTOCOLS: { title: string; icon: string; points: string[] }[] = [
  {
    title: 'Before class',
    icon: '⏰',
    points: [
      'Arrive 20–30 minutes early — and check all the equipment is safe.',
      'Vacuum and tidy the space so it’s clean and ready.',
      'Check the toilets are clean and stocked with toilet paper.',
      'Turn the speaker on.',
      'Put your uniform on and your name badge.',
      'Open Roll Call on the tablet for your class.',
      'Greet every child by name as they arrive.',
    ],
  },
  {
    title: 'Taking the roll',
    icon: '📋',
    points: [
      'Mark every child present / absent as they arrive.',
      'Take out the Star Reward cards and hand them out to the students.',
      'Award stars for effort, kindness and trying something new — not just skill.',
      'Note anything a parent should hear about (a great moment or a concern).',
    ],
  },
  {
    title: 'Child safety',
    icon: '🛡️',
    points: [
      'Never be alone one-on-one with a child out of sight of others.',
      'No photos of children without checking consent first.',
      'Report any concern to Rhett the same day.',
    ],
  },
  {
    title: 'The BigStar way',
    icon: '⭐',
    points: [
      'Circus isn’t a sport — we don’t rank kids. We help every kid find their thing.',
      'End every class on a win, so each child leaves feeling like a superstar.',
    ],
  },
]

export default async function ProtocolsPage() {
  const user = await verifySession()

  return (
    <DashboardShell
      user={user}
      currentPath="/protocols"
      pageTitle="Coach Protocols"
      pageSubtitle="How we run a BigStar class — check back any time"
    >
      <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 mb-5 max-w-3xl">
        📌 These are a starting set. Rhett can update them any time — you&apos;ll always see the latest here.
      </div>
      <div className="grid gap-3 sm:grid-cols-2 max-w-3xl">
        {PROTOCOLS.map((p) => (
          <div key={p.title} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
            <div className="flex items-center gap-2.5 mb-3">
              <span className="text-2xl">{p.icon}</span>
              <h2 className="font-extrabold text-zinc-900">{p.title}</h2>
            </div>
            <ul className="space-y-1.5 text-sm text-zinc-700 list-disc pl-5">
              {p.points.map((pt, i) => <li key={i}>{pt}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </DashboardShell>
  )
}
