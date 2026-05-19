'use client'

// Thin client wrapper that mounts JackyTour only when ?tour=<moduleId>
// appears in the URL. Lives next to JackyTour because DashboardShell is
// server-rendered and can't read URL queries without going client.

import { useEffect, useState } from 'react'
import { JackyTour } from './jacky-tour'

export function JackyTourMount() {
  const [moduleId, setModuleId] = useState<string | null>(null)

  useEffect(() => {
    function read() {
      const params = new URLSearchParams(window.location.search)
      const tour = params.get('tour')
      setModuleId(tour && tour.trim() ? tour : null)
    }
    read()
    window.addEventListener('popstate', read)
    return () => window.removeEventListener('popstate', read)
  }, [])

  if (!moduleId) return null

  return (
    <JackyTour
      moduleId={moduleId}
      onClose={() => {
        // Strip ?tour= from the URL without reloading
        const url = new URL(window.location.href)
        url.searchParams.delete('tour')
        window.history.replaceState(null, '', url.toString())
        setModuleId(null)
      }}
    />
  )
}
