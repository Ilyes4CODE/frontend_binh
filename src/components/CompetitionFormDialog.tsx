import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Competition, CompetitionReference, CompetitionStatus, CompetitionType } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface CompetitionFormState {
  name: string
  type: CompetitionType
  gender: 'MALE' | 'FEMALE' | 'MIXED'
  weight_class: string
  technique_event: string
  prescribed_form: string
  rounds_per_match: number
  judge_count: number
  scoring_mode: 'TRIMMED' | 'AVERAGE'
  status?: CompetitionStatus
}

export const EMPTY_COMPETITION: CompetitionFormState = {
  name: '',
  type: 'COMBAT',
  gender: 'MALE',
  weight_class: '',
  technique_event: '',
  prescribed_form: '',
  rounds_per_match: 3,
  judge_count: 3,
  scoring_mode: 'TRIMMED',
}

export function competitionToForm(c: Competition): CompetitionFormState {
  return {
    name: c.name,
    type: c.type,
    gender: c.gender,
    weight_class: c.weight_class,
    technique_event: c.technique_event,
    prescribed_form: c.prescribed_form,
    rounds_per_match: c.rounds_per_match,
    judge_count: c.judge_count,
    scoring_mode: c.scoring_mode,
    status: c.status,
  }
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass an existing competition to edit it; omit to create a new one. */
  competition?: Competition
  onSaved?: (competition: Competition) => void
}

export function CompetitionFormDialog({ open, onOpenChange, competition, onSaved }: Props) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEdit = Boolean(competition)
  const [form, setForm] = useState<CompetitionFormState>(EMPTY_COMPETITION)

  useEffect(() => {
    if (!open) return
    setForm(competition ? competitionToForm(competition) : EMPTY_COMPETITION)
  }, [open, competition])

  const { data: reference } = useQuery({
    queryKey: ['competition-reference'],
    queryFn: async () => (await api.get<CompetitionReference>('/competitions/reference/')).data,
  })

  const save = useMutation({
    mutationFn: async () => {
      if (competition) return (await api.patch<Competition>(`/admin/competitions/${competition.id}/`, form)).data
      return (await api.post<Competition>('/admin/competitions/', form)).data
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
      queryClient.invalidateQueries({ queryKey: ['competition', String(saved.id)] })
      onOpenChange(false)
      toast.success(t('admin.saved'))
      onSaved?.(saved)
    },
    onError: () => toast.error(t('register.genericError')),
  })

  const isCombat = form.type === 'COMBAT'
  const weightClasses =
    form.gender === 'FEMALE' ? reference?.female_weight_classes ?? [] : reference?.male_weight_classes ?? []
  const forms =
    form.gender === 'FEMALE' ? reference?.prescribed_quyen_female ?? [] : reference?.prescribed_quyen_male ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? t('comp.editCompetition') : t('comp.new')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('comp.name')}</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('comp.type')}</Label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as CompetitionType })}
              // Changing type after a draw exists would orphan the bracket.
              disabled={isEdit}
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="COMBAT">{t('comp.typeCOMBAT')}</SelectItem>
                <SelectItem value="TECHNIQUE">{t('comp.typeTECHNIQUE')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{t('comp.gender')}</Label>
            <Select
              value={form.gender}
              onValueChange={(v) =>
                setForm({ ...form, gender: v as CompetitionFormState['gender'], weight_class: '', prescribed_form: '' })
              }
            >
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">{t('comp.genderMALE')}</SelectItem>
                <SelectItem value="FEMALE">{t('comp.genderFEMALE')}</SelectItem>
                <SelectItem value="MIXED">{t('comp.genderMIXED')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCombat ? (
            <>
              <div className="space-y-1.5">
                <Label>{t('comp.weightClass')}</Label>
                <Select value={form.weight_class} onValueChange={(v) => setForm({ ...form, weight_class: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {weightClasses.map((w) => (
                      <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t('comp.roundsPerMatch')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={form.rounds_per_match}
                  onChange={(e) => setForm({ ...form, rounds_per_match: Number(e.target.value) })}
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>{t('comp.techniqueEvent')}</Label>
                <Select value={form.technique_event} onValueChange={(v) => setForm({ ...form, technique_event: v })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(reference?.technique_events ?? []).map((e) => (
                      <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {form.technique_event === 'QUYEN_PRESCRIBED' && (
                <div className="space-y-1.5">
                  <Label>{t('comp.prescribedForm')}</Label>
                  <Select value={form.prescribed_form} onValueChange={(v) => setForm({ ...form, prescribed_form: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {forms.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>{t('comp.judgeCount')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={9}
                  value={form.judge_count}
                  onChange={(e) => setForm({ ...form, judge_count: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('comp.scoringMode')}</Label>
                <Select
                  value={form.scoring_mode}
                  onValueChange={(v) => setForm({ ...form, scoring_mode: v as 'TRIMMED' | 'AVERAGE' })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRIMMED">{t('comp.scoringTRIMMED')}</SelectItem>
                    <SelectItem value="AVERAGE">{t('comp.scoringAVERAGE')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {isEdit && (
            <div className="space-y-1.5">
              <Label>{t('comp.status')}</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v as CompetitionStatus })}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['DRAFT', 'READY', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
                    <SelectItem key={s} value={s}>{t(`comp.status${s}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button onClick={() => save.mutate()} disabled={!form.name.trim()}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
