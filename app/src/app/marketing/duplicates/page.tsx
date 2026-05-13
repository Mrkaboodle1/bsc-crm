import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { mediaStats, duplicateGroups as _duplicateGroups } from '@/data/media-stats'

// Cast away the `as const` so length checks aren't statically known.
type DupGroup = { sha8: string; count: number; size: number; files: readonly string[] }
const duplicateGroups: DupGroup[] = _duplicateGroups as unknown as DupGroup[]

export default async function DuplicatesPage() {
  const user = await verifySession()

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="Duplicate cleanup"
      pageSubtitle={`${mediaStats.dupSets} sets · ${mediaStats.dupExtras} extra copies · ${mediaStats.dupGB.toFixed(2)} GB you could reclaim.`}
      pageActions={
        <a
          href="/marketing"
          className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50"
        >
          ← Marketing
        </a>
      }
    >
      <div className="space-y-5">
        <div className="bg-amber-50 border-l-4 border-amber-400 rounded-r-xl px-5 py-3 text-sm text-amber-900">
          <strong>Read-only for now.</strong> Each row below is a group of files with identical content (same sha256 hash). The CRM can&apos;t delete files from your USB automatically — but in the next slice I&apos;ll generate a PowerShell script you can run that deletes all the duplicates safely (keeps the oldest copy of each group).
        </div>

        {duplicateGroups.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-zinc-700">No duplicates found.</p>
            <p className="text-sm mt-1">Your library is clean.</p>
          </div>
        ) : (
          <ul className="bg-white rounded-2xl shadow-sm border border-zinc-200 divide-y divide-zinc-100">
            {duplicateGroups.map((g) => (
              <li key={g.sha8} className="px-5 py-4 flex items-start gap-4">
                <div className="text-3xl">📑</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-extrabold text-zinc-900">
                      {g.count} copies of one file
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">{g.sha8}</span>
                    <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded">
                      Wastes {(g.size * (g.count - 1) / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <ul className="mt-2 text-xs text-zinc-600 space-y-0.5">
                    {g.files.map((name, i) => (
                      <li key={name + i} className="flex items-baseline gap-2">
                        <span className="text-zinc-400">{i === 0 ? '🟢 keep' : '🔴 dup'}</span>
                        <span className="font-mono truncate">{name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardShell>
  )
}
