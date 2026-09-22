import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { Match } from '@/types'

interface BracketProps {
  matches: Match[]
  onSelect?: (match: Match) => void
  compact?: boolean
}

/** Label a round by how far it is from the final: Final, Semi-finals, etc. */
export function useRoundLabel() {
  const { t } = useTranslation()
  return (roundNumber: number, totalRounds: number) => {
    const fromEnd = totalRounds - roundNumber
    if (fromEnd === 0) return t('comp.final')
    if (fromEnd === 1) return t('comp.semiFinal')
    if (fromEnd === 2) return t('comp.quarterFinal')
    return t('comp.roundOf', { count: 2 ** (fromEnd + 1) })
  }
}

export function Bracket({ matches, onSelect, compact }: BracketProps) {
  const { t } = useTranslation()
  const roundLabel = useRoundLabel()
  if (matches.length === 0) return null

  const totalRounds = Math.max(...matches.map((m) => m.round_number))
  const rounds = Array.from({ length: totalRounds }, (_, i) =>
    matches.filter((m) => m.round_number === i + 1).sort((a, b) => a.position - b.position),
  )

  return (
    <div className="overflow-x-auto pb-2">
      <div className="flex min-w-max gap-6">
        {rounds.map((round, roundIndex) => (
          <div key={roundIndex} className="flex min-w-56 flex-col">
            <h3 className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-primary">
              {roundLabel(roundIndex + 1, totalRounds)}
            </h3>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {round.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  onSelect={onSelect}
                  compact={compact}
                  tbdLabel={t('comp.tbd')}
                  byeLabel={t('comp.byeShort')}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchCard({
  match,
  onSelect,
  compact,
  tbdLabel,
  byeLabel,
}: {
  match: Match
  onSelect?: (match: Match) => void
  compact?: boolean
  tbdLabel: string
  byeLabel: string
}) {
  const clickable = Boolean(onSelect) && match.status !== 'BYE'
  const Wrapper = clickable ? 'button' : 'div'
  // A bye was never fought, so its 0-0 "score" would be noise.
  const showScore = match.status === 'LIVE' || match.status === 'COMPLETED'

  return (
    <Wrapper
      {...(clickable ? { type: 'button' as const, onClick: () => onSelect?.(match) } : {})}
      className={cn(
        'w-full overflow-hidden rounded-lg border text-start transition-all duration-200',
        match.status === 'LIVE'
          ? 'border-primary ring-2 ring-primary/30'
          : 'border-border',
        clickable && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md',
        compact ? 'text-xs' : 'text-sm',
      )}
    >
      <Side
        name={match.participant_a?.name ?? (match.status === 'BYE' ? byeLabel : tbdLabel)}
        club={match.participant_a?.club}
        score={match.score_a}
        isWinner={Boolean(match.winner && match.winner.id === match.participant_a?.id)}
        showScore={showScore}
        muted={!match.participant_a}
      />
      <div className="h-px bg-border" />
      <Side
        name={match.participant_b?.name ?? (match.status === 'BYE' ? byeLabel : tbdLabel)}
        club={match.participant_b?.club}
        score={match.score_b}
        isWinner={Boolean(match.winner && match.winner.id === match.participant_b?.id)}
        showScore={showScore}
        muted={!match.participant_b}
      />
      {match.status === 'LIVE' && (
        <div className="bg-primary px-2 py-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
          ● LIVE
        </div>
      )}
    </Wrapper>
  )
}

function Side({
  name,
  club,
  score,
  isWinner,
  showScore,
  muted,
}: {
  name: string
  club?: string
  score: number
  isWinner: boolean
  showScore: boolean
  muted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 px-3 py-2',
        isWinner ? 'bg-secondary font-semibold' : 'bg-card',
        muted && 'text-muted-foreground',
      )}
    >
      <span className="truncate">
        {name}
        {club && <span className="ms-1 text-xs text-muted-foreground">({club})</span>}
      </span>
      {showScore && <span className="shrink-0 tabular-nums font-semibold">{score}</span>}
    </div>
  )
}
