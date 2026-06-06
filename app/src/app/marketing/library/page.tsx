import { verifySession } from '@/lib/dal'
import { DashboardShell } from '@/components/dashboard-shell'
import { mediaLibrary, type LibraryItem } from '@/data/media-library'

export default async function MediaLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; folder?: string; ext?: string; page?: string }>
}) {
  const { q, kind, folder, ext, page } = await searchParams
  const user = await verifySession()

  // Filter
  let rows: LibraryItem[] = [...mediaLibrary]
  if (kind === 'image' || kind === 'video') {
    rows = rows.filter((r) => r.kind === kind)
  }
  if (ext && ext.trim()) {
    rows = rows.filter((r) => r.ext === ext.trim())
  }
  if (folder && folder.trim()) {
    rows = rows.filter((r) => r.folder.toLowerCase().includes(folder.toLowerCase()))
  }
  if (q && q.trim()) {
    const term = q.trim().toLowerCase()
    rows = rows.filter((r) => r.name.toLowerCase().includes(term))
  }

  // Paginate (server-side, simple)
  const perPage = 60
  const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1)
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage))
  const slice = rows.slice((pageNum - 1) * perPage, pageNum * perPage)

  // Build folder facet
  const folderFacet = new Map<string, number>()
  for (const r of rows) {
    folderFacet.set(r.folder, (folderFacet.get(r.folder) ?? 0) + 1)
  }
  const topFolderList = [...folderFacet.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)

  return (
    <DashboardShell
      user={user}
      currentPath="/marketing"
      pageTitle="Media library"
      pageSubtitle={`${rows.length.toLocaleString()} files match${q || folder || kind || ext ? ' your filter' : ''}.`}
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
        {/* Cloud-thumbnails callout */}
        <div className="bg-blue-50 border-l-4 border-blue-400 rounded-r-xl px-5 py-3 text-sm text-blue-900">
          <strong>Photo previews — optional upgrade.</strong> The library lists all your files now. To show the actual photos as thumbnails, we can host them in cloud storage (about $0.10/month for all 17&nbsp;GB). Tell Jacky when you&apos;d like that switched on.
        </div>

        {/* Filter form */}
        <form className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-3 flex items-center gap-2 flex-wrap">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search filename…"
            className="flex-1 min-w-[180px] px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none"
          />
          <select
            name="kind"
            defaultValue={kind ?? ''}
            className="px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm font-bold focus:border-[#D72027] focus:outline-none"
          >
            <option value="">Images + videos</option>
            <option value="image">Images only</option>
            <option value="video">Videos only</option>
          </select>
          <input
            type="text"
            name="folder"
            defaultValue={folder ?? ''}
            placeholder="Folder contains…"
            className="px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none w-40"
          />
          <input
            type="text"
            name="ext"
            defaultValue={ext ?? ''}
            placeholder="ext (jpg/heic)"
            className="px-4 py-2.5 border-2 border-zinc-200 rounded-xl text-sm focus:border-[#D72027] focus:outline-none w-28"
          />
          <button
            type="submit"
            className="bg-zinc-900 text-white font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-zinc-800"
          >
            Filter
          </button>
          {(q || kind || folder || ext) && (
            <a
              href="/marketing/library"
              className="text-sm font-bold text-zinc-500 hover:text-zinc-900 px-3 py-2.5"
            >
              Clear
            </a>
          )}
        </form>

        {/* Folder chips */}
        {topFolderList.length > 0 && !folder && (
          <div className="flex flex-wrap gap-1.5">
            {topFolderList.map(([name, count]) => (
              <a
                key={name}
                href={`/marketing/library?folder=${encodeURIComponent(name)}`}
                className="text-xs font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200 px-3 py-1.5 rounded-full"
              >
                📂 {name} <span className="text-zinc-400">{count}</span>
              </a>
            ))}
          </div>
        )}

        {/* Grid */}
        {slice.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 p-10 text-center text-zinc-500">
            <div className="text-4xl mb-2">🪺</div>
            <p className="font-bold text-zinc-700">No files match.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {slice.map((f) => (
              <li key={f.sha} className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gradient-to-br from-zinc-100 to-zinc-200 flex flex-col items-center justify-center text-zinc-400 relative">
                  <div className="text-4xl">
                    {f.kind === 'video' ? '🎬' :
                     f.ext === 'heic' || f.ext === 'heif' ? '📱' :
                     '🖼'}
                  </div>
                  <div className="text-[10px] font-extrabold uppercase tracking-wider mt-1">{f.ext}</div>
                  <span className="absolute top-1.5 left-1.5 text-[9px] font-mono text-zinc-400 bg-white/80 px-1.5 py-0.5 rounded">
                    {f.sha8}
                  </span>
                </div>
                <div className="p-2.5">
                  <div className="text-xs font-bold text-zinc-800 truncate" title={f.name}>{f.name}</div>
                  <div className="text-[10px] text-zinc-500 mt-1 flex items-center justify-between">
                    <span>{f.mtime}</span>
                    <span>{(f.sizeKB / 1024).toFixed(1)} MB</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav className="flex items-center justify-center gap-1 pt-4">
            {Array.from({ length: Math.min(totalPages, 12) }, (_, i) => {
              const p = i + 1
              const params = new URLSearchParams()
              if (q) params.set('q', q)
              if (kind) params.set('kind', kind)
              if (folder) params.set('folder', folder)
              if (ext) params.set('ext', ext)
              params.set('page', String(p))
              const active = p === pageNum
              return (
                <a
                  key={p}
                  href={`/marketing/library?${params.toString()}`}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold ${
                    active
                      ? 'bg-zinc-900 text-white'
                      : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  {p}
                </a>
              )
            })}
            {totalPages > 12 && (
              <span className="text-xs text-zinc-400 px-2">… {totalPages} pages total</span>
            )}
          </nav>
        )}
      </div>
    </DashboardShell>
  )
}
