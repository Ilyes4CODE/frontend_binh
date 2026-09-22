import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Medal, Monitor, Pencil, Shuffle, Trash2, UserPlus } from 'lucide-react'
import { api } from '@/lib/api'
import type { CompetitionDetail, Match, StandingRow } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bracket } from '@/components/Bracket'
import { JudgeScorePanel } from '@/components/JudgeScorePanel'
import { CompetitionFormDialog } from '@/components/CompetitionFormDialog'
import { CertificatesPanel } from '@/components/CertificatesPanel'

export default function AdminCompetitionDetail() {
  const { id } = useParams<{ id: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [club, setClub] = useState('')
  const [bulk, setBulk] = useState('')
  const [editOpen, setEditOpen] = useState(false)

  const { data: competition, isLoading } = useQuery({
    queryKey: ['competition', id],
    queryFn: async () => (await api.get<CompetitionDetail>(`/admin/competitions/${id}/`)).data,
    enabled: !!id,
  })

  const { data: standings = [] } = useQuery({
    queryKey: ['competition-standings', id],
    queryFn: async () => (await api.get<StandingRow[]>(`/admin/competitions/${id}/standings/`)).data,
    enabled: !!id,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['competition', id] })
    queryClient.invalidateQueries({ queryKey: ['competition-standings', id] })
  }

  const addParticipant = useMutation({
    mutationFn: async () => (await api.post(`/admin/competitions/${id}/participants/`, { name, club })).data,
    onSuccess: () => { setName(''); setClub(''); invalidate() },
  })

  const addBulk = useMutation({
    mutationFn: async () =>
      (await api.post(`/admin/competitions/${id}/participants/`, { names: bulk.split('\n') })).data,
    onSuccess: () => { setBulk(''); invalidate(); toast.success(t('admin.saved')) },
  })

  const removeParticipant = useMutation({
    mutationFn: async (pid: number) => api.delete(`/admin/participants/${pid}/`),
    onSuccess: invalidate,
  })

  const draw = useMutation({
    mutationFn: async () => (await api.post(`/admin/competitions/${id}/generate-bracket/`)).data,
    onSuccess: () => { invalidate(); toast.success(t('admin.saved')) },
    onError: () => toast.error(t('comp.needTwo')),
  })

  const runningOrder = useMutation({
    mutationFn: async () => (await api.post(`/admin/competitions/${id}/generate-running-order/`)).data,
    onSuccess: () => { invalidate(); toast.success(t('admin.saved')) },
  })

  if (isLoading || !competition) return <p className="text-muted-foreground">{t('common.loading')}</p>

  const isCombat = competition.type === 'COMBAT'
  const hasDraw = isCombat ? competition.matches.length > 0 : competition.performances.length > 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{competition.name}</h1>
          {/* each part is isolated so Latin labels keep their order inside an RTL line */}
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {(isCombat
              ? [t('comp.typeCOMBAT'), competition.weight_class_display]
              : [t('comp.typeTECHNIQUE'), competition.technique_event_display, competition.prescribed_form]
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
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={competition.status === 'COMPLETED' ? 'default' : 'secondary'}>
            {t(`comp.status${competition.status}`)}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="size-4" />
            {t('common.edit')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(`/display/${competition.id}`, '_blank')}>
            <Monitor className="size-4" />
            {t('comp.openDisplay')}
          </Button>
        </div>
      </div>

      <CompetitionFormDialog open={editOpen} onOpenChange={setEditOpen} competition={competition} />
      <p className="text-xs text-muted-foreground">{t('comp.displayHint')}</p>

      <Tabs defaultValue={hasDraw ? 'draw' : 'participants'}>
        <TabsList>
          <TabsTrigger value="participants">{t('comp.participants')}</TabsTrigger>
          <TabsTrigger value="draw">{isCombat ? t('comp.bracket') : t('comp.runningOrder')}</TabsTrigger>
          <TabsTrigger value="standings">{t('comp.standings')}</TabsTrigger>
          <TabsTrigger value="certificates">{t('comp.certificates')}</TabsTrigger>
        </TabsList>

        <TabsContent value="participants" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">{t('comp.addParticipant')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label>{t('comp.participantName')}</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{t('comp.club')}</Label>
                  <Input value={club} onChange={(e) => setClub(e.target.value)} />
                </div>
                <Button onClick={() => addParticipant.mutate()} disabled={!name.trim()}>
                  <UserPlus className="size-4" />{t('comp.addParticipant')}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">{t('comp.bulkAdd')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Textarea
                  rows={6}
                  value={bulk}
                  onChange={(e) => setBulk(e.target.value)}
                  placeholder={t('comp.bulkAddHint')}
                />
                <Button onClick={() => addBulk.mutate()} disabled={!bulk.trim()}>
                  {t('comp.bulkAddButton')}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('comp.seed')}</TableHead>
                    <TableHead>{t('comp.participantName')}</TableHead>
                    <TableHead>{t('comp.club')}</TableHead>
                    <TableHead className="text-end">{t('common.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {competition.participants.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="tabular-nums">{p.seed || i + 1}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-muted-foreground">{p.club || '—'}</TableCell>
                      <TableCell className="text-end">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => { if (confirm(t('comp.removeParticipant'))) removeParticipant.mutate(p.id) }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => {
                if (hasDraw && !confirm(t('comp.bracketWarning'))) return
                if (isCombat) draw.mutate()
                else runningOrder.mutate()
              }}
              disabled={competition.participants.length < (isCombat ? 2 : 1)}
            >
              <Shuffle className="size-4" />
              {isCombat
                ? (hasDraw ? t('comp.regenerateBracket') : t('comp.generateBracket'))
                : t('comp.generateRunningOrder')}
            </Button>
            {isCombat && <p className="text-xs text-muted-foreground">{t('comp.seedHint')}</p>}
          </div>
        </TabsContent>

        <TabsContent value="draw" className="pt-4">
          {isCombat ? (
            competition.matches.length === 0 ? (
              <p className="text-muted-foreground">{t('comp.generateBracket')}</p>
            ) : (
              <div className="space-y-4">
                <p className="rounded-md bg-secondary p-3 text-sm text-secondary-foreground">
                  {t('comp.preBoutNotice', { count: 5 })}
                </p>
                <Bracket
                  matches={competition.matches}
                  onSelect={(match: Match) => navigate(`/admin/matches/${match.id}`)}
                />
              </div>
            )
          ) : competition.performances.length === 0 ? (
            <p className="text-muted-foreground">{t('comp.generateRunningOrder')}</p>
          ) : (
            <div className="space-y-3">
              {competition.performances.map((performance) => (
                <JudgeScorePanel
                  key={performance.id}
                  performance={performance}
                  judgeCount={competition.judge_count}
                  maxScore={Number(competition.max_score)}
                  onChanged={invalidate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="standings" className="pt-4">
          <StandingsTable rows={standings} isCombat={isCombat} />
        </TabsContent>

        <TabsContent value="certificates" className="pt-4">
          <CertificatesPanel competitionId={competition.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

const MEDAL_STYLES: Record<string, string> = {
  GOLD: 'bg-brand-gold text-brand-gold-foreground',
  SILVER: 'bg-muted text-foreground',
  BRONZE: 'bg-secondary text-secondary-foreground',
}

function StandingsTable({ rows, isCombat }: { rows: StandingRow[]; isCombat: boolean }) {
  const { t } = useTranslation()
  if (rows.length === 0) return <p className="text-muted-foreground">{t('comp.noStandingsYet')}</p>

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('comp.place')}</TableHead>
                <TableHead>{t('comp.participantName')}</TableHead>
                <TableHead>{t('comp.club')}</TableHead>
                {!isCombat && <TableHead className="text-end">{t('comp.finalScore')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={`${row.participant.id}-${i}`}>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                        row.medal ? MEDAL_STYLES[row.medal] : 'bg-muted'
                      }`}
                    >
                      <Medal className="size-3.5" />
                      {row.place}
                      {row.medal && ` · ${t(`comp.medal${row.medal}`)}`}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{row.participant.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.participant.club || '—'}</TableCell>
                  {!isCombat && <TableCell className="text-end font-bold tabular-nums">{row.score}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {isCombat && <p className="text-xs text-muted-foreground">{t('comp.bronzeNote')}</p>}
    </div>
  )
}
