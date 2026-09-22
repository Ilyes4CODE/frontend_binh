import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check } from 'lucide-react'
import { api } from '@/lib/api'
import type { Performance } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  performance: Performance
  judgeCount: number
  maxScore: number
  onChanged: () => void
}

/** One competitor's routine: the panel's marks go in here and the final score
 *  is recomputed server-side after every entry. */
export function JudgeScorePanel({ performance, judgeCount, maxScore, onChanged }: Props) {
  const { t } = useTranslation()
  const judges = Array.from({ length: judgeCount }, (_, i) => `J${i + 1}`)
  const existing = Object.fromEntries(performance.judge_scores.map((s) => [s.judge_name, s.score]))
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [penalty, setPenalty] = useState(performance.penalty)

  const saveScore = useMutation({
    mutationFn: async ({ judge, score }: { judge: string; score: string }) =>
      (await api.post(`/admin/performances/${performance.id}/score/`, { judge_name: judge, score })).data,
    onSuccess: onChanged,
    onError: () => toast.error(`0 – ${maxScore}`),
  })

  const finalize = useMutation({
    mutationFn: async () =>
      (await api.post(`/admin/performances/${performance.id}/finalize/`, { penalty })).data,
    onSuccess: () => { onChanged(); toast.success(t('admin.saved')) },
  })

  const isDone = performance.status === 'COMPLETED'

  return (
    <Card className={isDone ? 'border-primary/40' : undefined}>
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold tabular-nums">
              {performance.order}
            </span>
            <div>
              <p className="font-semibold">{performance.participant.name}</p>
              <p className="text-xs text-muted-foreground">
                {[performance.participant.club, performance.form_name].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {performance.final_score !== null && (
              <div className="text-end">
                <p className="text-xs text-muted-foreground">{t('comp.finalScore')}</p>
                <p className="text-2xl font-bold tabular-nums text-primary">{performance.final_score}</p>
              </div>
            )}
            {isDone && <Badge><Check className="size-3" />{t('comp.statusCOMPLETED')}</Badge>}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          {judges.map((judge) => (
            <div key={judge} className="w-24 space-y-1.5">
              <Label className="text-xs">{t('comp.judge')} {judge}</Label>
              <Input
                type="number"
                step="0.1"
                min={0}
                max={maxScore}
                disabled={isDone}
                value={drafts[judge] ?? existing[judge] ?? ''}
                onChange={(e) => setDrafts({ ...drafts, [judge]: e.target.value })}
                onBlur={(e) => {
                  const value = e.target.value
                  if (value !== '' && value !== existing[judge]) saveScore.mutate({ judge, score: value })
                }}
              />
            </div>
          ))}

          <div className="w-28 space-y-1.5">
            <Label className="text-xs">{t('comp.penaltyDeduction')}</Label>
            <Input
              type="number"
              step="0.1"
              min={0}
              disabled={isDone}
              value={penalty}
              onChange={(e) => setPenalty(e.target.value)}
            />
          </div>

          {!isDone && (
            <Button onClick={() => finalize.mutate()} disabled={performance.judge_scores.length === 0}>
              {t('comp.finalize')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
