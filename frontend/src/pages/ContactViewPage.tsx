import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EscalationBanner } from '../components/EscalationBanner'
import { Card } from '../components/ui/Card'
import { Spinner } from '../components/ui/Spinner'
import { api } from '../mock-api'
import type { WalkSession } from '../types'

// Default anchor coordinates if GPS not yet reported
const DEFAULT_LAT = 25.758
const DEFAULT_LNG = -80.3733

// TODO: Replace with real Gemini-generated summary from backend
function getSummaryText(session: WalkSession): string {
  if (session.current_level === 1) {
    return 'Everything looks normal. Active walk is proceeding with regular check-ins.'
  }
  const stationaryText = session.is_stationary ? 'and has been stationary for several minutes ' : ''
  if (session.current_level === 2) {
    return `She missed her scheduled check-in ${stationaryText}— her primary contact was notified to check in on her.`
  }
  if (session.current_level === 3) {
    return `Multiple check-ins missed without response ${stationaryText}— emergency contact notified and monitoring escalated.`
  }
  return `No response received after repeated pings ${stationaryText}— escalating to emergency response protocol.`
}

export function ContactViewPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [session, setSession] = useState<WalkSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let isMounted = true

    async function fetchStatus() {
      try {
        const data = await api.walkSessions.getSessionStatus(sessionId!)
        if (isMounted) {
          setSession(data)
          setNotFound(false)
        }
      } catch (err) {
        if (isMounted && !session) {
          setNotFound(true)
        }
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchStatus()

    // Poll every 3 seconds for live updates
    const interval = setInterval(fetchStatus, 3000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-slate-50">
        <Spinner />
      </div>
    )
  }

  if (notFound || !session) {
    return (
      <main className="flex min-h-svh items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6">
          <h1 className="text-xl font-semibold text-slate-900 mb-2">Session Not Found</h1>
          <p className="text-sm text-slate-600 mb-4">
            This contact link is invalid or the walk session may have expired.
          </p>
          <a
            href="/"
            className="inline-block text-sm font-medium text-violet-600 hover:text-violet-700"
          >
            Return to Home
          </a>
        </Card>
      </main>
    )
  }

  const lat = session.last_known_lat ?? DEFAULT_LAT
  const lng = session.last_known_lng ?? DEFAULT_LNG
  const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
  const timestampStr = session.last_location_timestamp
    ? new Date(session.last_location_timestamp).toLocaleTimeString()
    : 'Just now'

  // --- LEVEL 4: SIMULATED EMERGENCY DISPATCH TAKEOVER SCREEN ---
  if (session.current_level === 4) {
    return (
      <main className="min-h-svh bg-red-950 text-white flex flex-col justify-between p-6">
        <div className="mx-auto max-w-lg w-full pt-6">
          {/* Simulation disclaimer banner */}
          <div className="mb-6 rounded-xl border border-red-500 bg-red-900/80 px-4 py-3 text-center shadow-lg">
            <span className="inline-block rounded-full bg-red-500 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white mb-1">
              Simulation Demo
            </span>
            <p className="text-xs text-red-200">
              No live 911 dispatch or calls have been placed. This screen demonstrates simulated emergency escalation.
            </p>
          </div>

          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-600/30 ring-8 ring-red-600/20 text-3xl mb-4">
              🚨
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Emergency Services Would Now Be Contacted
            </h1>
            <p className="mt-2 text-sm text-red-200">
              Repeated check-ins were missed. Under production protocols, local emergency responders and designated emergency contacts are dispatched.
            </p>
          </div>

          {/* Last known location card */}
          <div className="rounded-2xl border border-red-800 bg-red-900/40 p-5 backdrop-blur mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-red-300 mb-2">
              Last Known Location
            </h2>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-mono text-base font-semibold text-white">
                  {lat.toFixed(5)}, {lng.toFixed(5)}
                </p>
                <p className="text-xs text-red-300">Updated: {timestampStr}</p>
              </div>
              {session.is_stationary && (
                <span className="rounded-full bg-red-800/80 border border-red-600 px-2.5 py-1 text-xs font-medium text-red-200">
                  Stationary
                </span>
              )}
            </div>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-500 shadow"
            >
              Open in Google Maps ↗
            </a>
          </div>

          {/* Context summary */}
          <div className="rounded-xl border border-red-900/60 bg-red-950/60 p-4 text-xs text-red-300">
            <p className="font-semibold text-red-200 mb-1">Status Summary</p>
            <p>{getSummaryText(session)}</p>
          </div>
        </div>

        <div className="mx-auto max-w-lg w-full pb-6 pt-4 text-center">
          <p className="text-xs text-red-400">
            Safety Walking Companion • Contact Alert View
          </p>
        </div>
      </main>
    )
  }

  // --- LEVELS 1 to 3: STANDARD CONTACT VIEW ---
  return (
    <main className="min-h-svh bg-slate-50 p-4 pb-16">
      <div className="mx-auto max-w-md space-y-4">
        {/* Header */}
        <header className="pt-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Safety Walking Companion
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Contact Live View</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status shared with designated contacts
          </p>
        </header>

        {/* Live Escalation Banner */}
        <EscalationBanner level={session.current_level} />

        {/* AI / Gemini Summary Card */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
              AI SUMMARY
            </span>
            <span className="text-xs text-slate-400">Auto-generated</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">
            {getSummaryText(session)}
          </p>
        </Card>

        {/* Location & GPS Card */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Last Known Location</h2>
              <p className="text-xs text-slate-500">Updated: {timestampStr}</p>
            </div>
            {session.is_stationary && (
              <span className="rounded-full bg-amber-100 border border-amber-300 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                Still / Stationary
              </span>
            )}
          </div>

          <p className="font-mono text-xs text-slate-600 mb-3">
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </p>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Open in Google Maps ↗
          </a>
        </Card>

        {/* Walk Status Note */}
        {session.status === 'resolved' && (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-center">
            <p className="text-sm font-medium text-emerald-800">
              ✓ This walk has concluded safely.
            </p>
          </div>
        )}

        {/* Live polling pulse indicator */}
        <footer className="flex items-center justify-center gap-2 pt-2 text-xs text-slate-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          Live updating every 3s
        </footer>
      </div>
    </main>
  )
}
