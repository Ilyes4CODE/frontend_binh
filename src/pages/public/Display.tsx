import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import { Maximize, Minimize } from 'lucide-react'
import { api } from '@/lib/api'
import type { DisplayState } from '@/types'
import { Bracket } from '@/components/Bracket'
import { cn } from '@/lib/utils'

type ViewMode = 'AUTO' | 'LIVE' | 'BRACKET' | 'RESULTS'

/**
 * Full-screen view for the hall projector. Polls on its own so the operator
 * can open it once and leave it; no login needed on the display machine.
 */
export default function Display() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const [view, setView] = useState<ViewMode>('AUTO')
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen()
    else document.documentElement.requestFullscreen().catch(() => undefined)
  }, [])

  const { data } = useQuery({
    queryKey: ['display', id],
    queryFn: async () => (await api.get<DisplayState>(`/competitions/${id}/display/`)).data,
    enabled: !!id,
    refetchInterval: 2000,
  })

  if (!data) {
    return <div className="flex min-h-screen items-center justify-center bg-neutral-950 text-white">…</div>
  }

  const { competition, live_match: match, live_performance: performance, standings } = data

  // AUTO follows the competition; the other modes let the operator pin a screen.
  const hasStandings = Boolean(standings && standings.length > 0)
  const resolved: Exclude<ViewMode, 'AUTO'> =
    view !== 'AUTO' ? view
    : match || performance ? 'LIVE'
    : hasStandings ? 'RESULTS'
    : 'BRACKET'

  const bracketMatches = data.matches ?? []

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-white">
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-8 py-5">
        <div className="flex items-center gap-4">
          <img src="/logo.png" alt="" className="size-12 rounded-full" />
          <div>
            <h1 className="text-2xl font-bold">{competition.name}</h1>
            <p className="flex flex-wrap items-center gap-1.5 text-sm text-white/60">
              {(competition.type === 'COMBAT'
                ? [t('comp.typeCOMBAT'), competition.weight_class_display]
                : [t('comp.typeTECHNIQUE'), competition.technique_event_display]
              )
                .filter(Boolean)
                .map((part, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden>·</span>}
                    <bdi>{part}</bdi>
                  </span>
                ))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold">
            {t(`comp.status${competition.status}`)}
          </span>

          <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
            {(['AUTO', 'LIVE', 'BRACKET', 'RESULTS'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors duration-200',
                  view === mode ? 'bg-white text-neutral-900' : 'text-white/70 hover:text-white',
                )}
              >
                {t(`comp.view${mode.charAt(0)}${mode.slice(1).toLowerCase()}`)}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? t('comp.exitFullscreen') : t('comp.fullscreen')}
            className="flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-colors duration-200 hover:bg-white/20"
          >
            {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center px-8 py-8">
        {resolved === 'RESULTS' && standings && standings.length > 0 ? (
          <FinalStandings rows={standings} />
        ) : resolved === 'BRACKET' && bracketMatches.length > 0 ? (
          <div className="mx-auto w-full max-w-6xl rounded-xl bg-white p-6 text-neutral-900">
            <Bracket matches={bracketMatches} compact />
          </div>
        ) : resolved === 'LIVE' && match ? (
          <LiveMatch match={match} />
        ) : resolved === 'LIVE' && performance ? (
          <LivePerformance performance={performance} />
        ) : (
          <div className="space-y-10 text-center">
            <p className="text-3xl text-white/50">
              {competition.type === 'COMBAT' ? t('comp.waitingForBout') : t('comp.waitingForPerformance')}
            </p>
            {bracketMatches.length > 0 && (
              <div className="mx-auto w-full max-w-6xl rounded-xl bg-white p-6 text-neutral-900">
                <Bracket matches={bracketMatches} compact />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function LiveMatch({ match }: { match: NonNullable<DisplayState['live_match']> }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-10">
      <p className="text-center text-2xl uppercase tracking-widest text-white/50">
        {t('comp.round')} {match.current_round}
      </p>
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <Fighter name={match.participant_a?.name} club={match.participant_a?.club} score={match.score_a} accent="text-primary" />
        <div className="text-center text-4xl font-bold text-white/30">—</div>
        <Fighter name={match.participant_b?.name} club={match.participant_b?.club} score={match.score_b} accent="text-white" />
      </div>
      {match.winner && (
        <p className="text-center text-4xl font-extrabold text-brand-gold">
          {t('comp.declareWinnerFor', { name: match.winner.name })}
        </p>
      )}
    </div>
  )
}

function Fighter({
  name,
  club,
  score,
  accent,
}: {
  name?: string
  club?: string
  score: number
  accent: string
}) {
  const { t } = useTranslation()
  return (
    <div className="text-center">
      <p className="truncate text-4xl font-bold md:text-5xl">{name ?? t('comp.tbd')}</p>
      {club && <p className="mt-2 text-xl text-white/50">{club}</p>}
      <p className={`mt-4 text-[8rem] font-extrabold leading-none tabular-nums ${accent}`}>{score}</p>
    </div>
  )
}

function LivePerformance({ performance }: { performance: NonNullable<DisplayState['live_performance']> }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-8 text-center">
      <p className="text-2xl uppercase tracking-widest text-white/50">#{performance.order}</p>
      <p className="text-6xl font-extrabold">{performance.participant.name}</p>
      {performance.participant.club && <p className="text-2xl text-white/50">{performance.participant.club}</p>}
      {performance.form_name && <p className="text-3xl text-brand-gold">{performance.form_name}</p>}
      {performance.final_score && (
        <div>
          <p className="text-xl uppercase tracking-widest text-white/50">{t('comp.finalScore')}</p>
          <p className="text-[8rem] font-extrabold leading-none text-primary tabular-nums">{performance.final_score}</p>
        </div>
      )}
    </div>
  )
}

function FinalStandings({ rows }: { rows: NonNullable<DisplayState['standings']> }) {
  const { t } = useTranslation()
  const medalColor: Record<string, string> = {
    GOLD: 'bg-brand-gold text-neutral-900',
    SILVER: 'bg-white/80 text-neutral-900',
    BRONZE: 'bg-primary text-white',
  }
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <h2 className="text-center text-3xl font-bold text-white/70">{t('comp.standings')}</h2>
      {rows.map((row, i) => (
        <div key={`${row.participant.id}-${i}`} className="flex items-center gap-5 rounded-xl bg-white/5 px-6 py-4">
          <span className={`flex size-14 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold ${row.medal ? medalColor[row.medal] : 'bg-white/10'}`}>
            {row.place}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-3xl font-bold">{row.participant.name}</p>
            {row.participant.club && <p className="text-lg text-white/50">{row.participant.club}</p>}
          </div>
          {row.score && <span className="text-3xl font-bold tabular-nums text-primary">{row.score}</span>}
        </div>
      ))}
    </div>
  )
}
