import { verifySession } from '@/lib/dal'
import { createServerSupabase } from '@/lib/supabase-server'
import { DashboardShell } from '@/components/dashboard-shell'
import { PlaylistsClient, type Playlist } from '@/components/playlists-client'

export const dynamic = 'force-dynamic'

export default async function StudioMusicPage() {
  const user = await verifySession()
  const supabase = await createServerSupabase()
  const { data, error } = await supabase.from('playlists').select('id, name, tracks').eq('tenant_id', user.tenantId).order('created_at')
  const missing = !!error && (error.message.includes('does not exist') || error.message.includes('relation'))

  return (
    <DashboardShell
      user={user}
      currentPath="/coach-portal/music"
      pageTitle="🎵 Studio Playlists"
      pageSubtitle="Build named playlists for classes & showcases — they play in the studio music player"
      pageActions={<a href="/coach-portal" className="inline-flex items-center gap-2 bg-white border border-zinc-200 text-zinc-700 font-bold text-sm px-4 py-2.5 rounded-lg hover:bg-zinc-50">← Coach Events</a>}
    >
      <div className="max-w-3xl">
        {missing ? (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-900">
            Playlists need their database table set up first. Paste migration <strong>042_playlists.sql</strong> into Supabase, then refresh.
          </div>
        ) : (
          <PlaylistsClient initial={(data ?? []) as Playlist[]} />
        )}
      </div>
    </DashboardShell>
  )
}
