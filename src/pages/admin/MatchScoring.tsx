import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Flag, Monitor, Play, Trophy, Undo2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { CompetitionParticipant, Match } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

const POINT_VALUES = [1, 2, 3]

export default function MatchScoring() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: async () => (await api.get<Match>(`/admin/matches/${id}/`)).data,
    enabled: !!id,
    refetchInterval: 3000,
  })

  const refresh = (updated?: Match) => {
    if (updated) queryClient.setQueryData(['match', id], updated)
    queryClient.invalidateQueries({ queryKey: ['match', id] })
    queryClient.invalidateQueries({ queryKey: ['competition'] })
  }

  const start = useMutation({
    mutationFn: async () => (await api.post(`/admin/matches/${id}/start/`)).data,
    onSuccess: refresh,
    onError: () => toast.error(t('comp.tbd')),
  })

  const score = useMutation({
    mutationFn: async (payload: { participant: number; points: number; kind?: string }) =>
      (await api.post(`/admin/matches/${id}/score/`, payload)).data,
    onSuccess: (data) => refresh(data.match),
  })

  const undo = useMutation({
    mutationFn: async () => (await api.post(`/admin/matches/${id}/undo-score/`)).data,
    onSuccess: refresh,
  })

  const setRound = useMutation({
    mutationFn: async (round: number) => (await api.post(`/admin/matches/${id}/set-round/`, { round })).data,
    onSuccess: refresh,
  })

  const declareWinner = useMutation({
    mutationFn: async (winner: number) =>
      (await api.post(`/admin/matches/${id}/declare-winner/`, { winner })).data,
    onSuccess: (data) => { refresh(data); toast.success(t('comp.winner')) },
  })

  const reopen = useMutation({
    mutationFn: async () => (await api.post(`/admin/matches/${id}/reopen/`)).data,
    onSuccess: refresh,
  })

  if (isLoading || !match) return <p className="text-muted-foreground">{t('common.loading')}</p>

  const rounds = match.rounds_per_match ?? 3
  const competitionId = match.competition_id
  const isLive = match.status === 'LIVE'
  const isDone = match.status === 'COMPLETED'
  const canScore = isLive && match.participant_a && match.participant_b

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t('common.back')}
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          {match.competition_name && <span className="text-sm text-muted-foreground">{match.competition_name}</span>}
          <Badge variant={isLive ? 'default' : 'secondary'}>{t(`comp.matchStatus${match.status}`)}</Badge>
          {competitionId && (
            <Button variant="outline" size="sm" onClick={() => window.open(`/display/${competitionId}`, '_blank')}>
              <Monitor className="size-4" />
              {t('comp.openDisplay')}
            </Button>
          )}
        </div>
      </div>

      {!isLive && !isDone && (
        <div className="flex justify-center">
          <Button size="lg" onClick={() => start.mutate()} disabled={!match.participant_a || !match.participant_b}>
            <Play className="size-4" />
            {t('comp.startMatch')}
          </Button>
        </div>
      )}

      {isLive && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">{t('comp.round')}</span>
          {Array.from({ length: rounds }, (_, i) => i + 1).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={match.current_round === r ? 'default' : 'outline'}
              onClick={() => setRound.mutate(r)}
            >
              {r}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={() => undo.mutate()}>
            <Undo2 className="size-4" />
            {t('comp.undo')}
          </Button>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Corner
          participant={match.participant_a}
          score={match.score_a}
          accent="red"
          isWinner={match.winner?.id === match.participant_a?.id}
          canScore={Boolean(canScore)}
          isDone={isDone}
          onScore={(points, kind) =>
            match.participant_a && score.mutate({ participant: match.participant_a.id, points, kind })
          }
          onDeclare={() => match.participant_a && declareWinner.mutate(match.participant_a.id)}
        />
        <Corner
          participant={match.participant_b}
          score={match.score_b}
          accent="blue"
          isWinner={match.winner?.id === match.participant_b?.id}
          canScore={Boolean(canScore)}
          isDone={isDone}
          onScore={(points, kind) =>
            match.participant_b && score.mutate({ participant: match.participant_b.id, points, kind })
          }
          onDeclare={() => match.participant_b && declareWinner.mutate(match.participant_b.id)}
        />
      </div>

      {isDone && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <p className="flex items-center gap-2 text-lg font-bold">
            <Trophy className="size-5 text-primary" />
            {t('comp.declareWinnerFor', { name: match.winner?.name })}
          </p>
          <Button variant="outline" size="sm" onClick={() => reopen.mutate()}>{t('comp.reopen')}</Button>
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-semibold">{t('comp.scoreSheet')}</h3>
          {(match.scoring_events ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('comp.noScoringYet')}</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {(match.scoring_events ?? []).map((event) => {
                const who =
                  event.participant === match.participant_a?.id ? match.participant_a?.name : match.participant_b?.name
                return (
                  <li key={event.id} className="flex items-center justify-between gap-3 border-b border-border pb-1 last:border-0">
                    <span>
                      <span className="text-muted-foreground">R{event.round_number}</span> · {who}
                    </span>
                    <span className={cn('font-semibold tabular-nums', event.points < 0 ? 'text-destructive' : 'text-primary')}>
                      {event.points > 0 ? `+${event.points}` : event.points}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

    </div>
  )
}

function Corner({
  participant,
  score,
  accent,
  isWinner,
  canScore,
  isDone,
  onScore,
  onDeclare,
}: {
  participant: CompetitionParticipant | null
  score: number
  accent: 'red' | 'blue'
  isWinner: boolean
  canScore: boolean
  isDone: boolean
  onScore: (points: number, kind?: string) => void
  onDeclare: () => void
}) {
  const { t } = useTranslation()
  if (!participant) {
    return (
      <Card><CardContent className="flex h-64 items-center justify-center p-6 text-muted-foreground">
        {t('comp.tbd')}
      </CardContent></Card>
    )
  }

  return (
    <Card className={cn('overflow-hidden', isWinner && 'ring-2 ring-primary')}>
      <div className={cn('h-1.5', accent === 'red' ? 'bg-primary' : 'bg-foreground')} />
      <CardContent className="space-y-4 p-6 text-center">
        <div>
          <p className="text-lg font-bold">{participant.name}</p>
          {participant.club && <p className="text-xs text-muted-foreground">{participant.club}</p>}
        </div>

        <p className="text-6xl font-extrabold tabular-nums">{score}</p>

        {canScore && (
          <>
            <div className="flex justify-center gap-2">
              {POINT_VALUES.map((points) => (
                <Button key={points} size="lg" onClick={() => onScore(points)} className="min-w-14 text-lg">
                  {t('comp.addPoint', { points })}
                </Button>
              ))}
            </div>
            <div className="flex justify-center gap-2">
              <Button size="sm" variant="destructive" onClick={() => onScore(-1, 'PENALTY')}>
                <Flag className="size-3.5" />
                {t('comp.penalty')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onScore(0, 'WARNING')}>
                {t('comp.warning')}
              </Button>
            </div>
            <Button variant="secondary" className="w-full" onClick={onDeclare}>
              <Trophy className="size-4" />
              {t('comp.declareWinner')}
            </Button>
          </>
        )}

        {isDone && isWinner && (
          <Badge className="mx-auto"><Trophy className="size-3" />{t('comp.winner')}</Badge>
        )}
      </CardContent>
    </Card>
  )
}
