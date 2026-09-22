import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Monitor, Pencil, Plus, Swords, Trash2, Trophy } from 'lucide-react'
import { api } from '@/lib/api'
import type { Competition } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CompetitionFormDialog } from '@/components/CompetitionFormDialog'

export default function AdminCompetitions() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Competition | null>(null)

  const { data: competitions = [] } = useQuery({
    queryKey: ['competitions'],
    queryFn: async () => (await api.get<Competition[]>('/admin/competitions/')).data,
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/competitions/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] })
      toast.success(t('admin.saved'))
    },
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('comp.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('comp.subtitle')}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t('comp.new')}
        </Button>
      </div>

      <CompetitionFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(created) => navigate(`/admin/competitions/${created.id}`)}
      />
      <CompetitionFormDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        competition={editing ?? undefined}
      />

      {competitions.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">{t('comp.noCompetitions')}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {competitions.map((c) => (
          <Card
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/admin/competitions/${c.id}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                navigate(`/admin/competitions/${c.id}`)
              }
            }}
            className="cursor-pointer transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-2">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                  {c.type === 'COMBAT'
                    ? <Swords className="size-5 text-primary" />
                    : <Trophy className="size-5 text-primary" />}
                </span>
                {/* stopPropagation so row actions don't also open the competition */}
                <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost" title={t('comp.openDisplay')}
                    onClick={() => window.open(`/display/${c.id}`, '_blank')}>
                    <Monitor className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title={t('comp.editCompetition')} onClick={() => setEditing(c)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    title={t('common.delete')}
                    onClick={() => { if (confirm(t('comp.deleteConfirm'))) deleteMutation.mutate(c.id) }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div>
                <p className="font-semibold">{c.name}</p>
                <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                  {(c.type === 'COMBAT'
                    ? [t('comp.typeCOMBAT'), c.weight_class_display]
                    : [t('comp.typeTECHNIQUE'), c.technique_event_display]
                  )
                    .filter(Boolean)
                    .map((part, i) => (
                      <span key={i} className="flex items-center gap-1">
                        {i > 0 && <span aria-hidden>·</span>}
                        <bdi>{part}</bdi>
                      </span>
                    ))}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={c.status === 'COMPLETED' ? 'default' : 'secondary'}>
                  {t(`comp.status${c.status}`)}
                </Badge>
                <Badge variant="outline">{t('comp.participantCount', { count: c.participant_count })}</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
