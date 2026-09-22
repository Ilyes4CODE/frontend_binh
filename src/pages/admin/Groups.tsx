import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, Clock, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { Club, Paginated, RegistrationListItem, TimetableDay, TrainingGroup } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

const NONE = '__none__'

interface GroupForm {
  club: string
  center: string
  name_ar: string
  name_en: string
  coach: string
  capacity: number
}

const EMPTY: GroupForm = { club: '', center: NONE, name_ar: '', name_en: '', coach: '', capacity: 0 }

export default function AdminGroups() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperAdmin = user?.is_super_admin ?? false

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingGroup | null>(null)
  const [form, setForm] = useState<GroupForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)
  const [membersFor, setMembersFor] = useState<TrainingGroup | null>(null)

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await api.get<TrainingGroup[]>('/admin/groups/')).data,
  })
  const isBranchManager = user?.is_branch_manager ?? false
  // A branch manager is refused club records and has only one branch — the
  // server pins their groups to it — so there is nothing to choose.
  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    enabled: Boolean(user) && !isBranchManager,
    queryFn: async () => (await api.get<Club[]>('/admin/clubs/')).data,
  })
  const { data: timetable = [] } = useQuery({
    queryKey: ['timetable'],
    queryFn: async () => (await api.get<TimetableDay[]>('/admin/timetable/')).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['groups'] })
    queryClient.invalidateQueries({ queryKey: ['timetable'] })
  }

  useEffect(() => {
    if (!open) return
    setError(null)
    if (editing) {
      setForm({
        club: String(editing.club),
        center: editing.center ? String(editing.center) : NONE,
        name_ar: editing.name_ar,
        name_en: editing.name_en,
        coach: editing.coach,
        capacity: editing.capacity,
      })
    } else {
      setForm({ ...EMPTY, club: user?.club ? String(user.club) : String(clubs[0]?.id ?? '') })
    }
  }, [open, editing, clubs, user])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        club: Number(form.club),
        center: form.center !== NONE ? Number(form.center) : null,
        name_ar: form.name_ar,
        name_en: form.name_en,
        coach: form.coach,
        capacity: Number(form.capacity) || 0,
      }
      if (editing) return (await api.patch(`/admin/groups/${editing.id}/`, payload)).data
      return (await api.post('/admin/groups/', payload)).data
    },
    onSuccess: () => { refresh(); setOpen(false); setEditing(null); toast.success(t('admin.saved')) },
    onError: (err: any) => {
      const data = err?.response?.data
      if (typeof data !== 'object' || data === null) return setError(t('register.genericError'))
      // The club+name pair is unique; DRF reports that as a non_field_error.
      const flat = Object.values(data).flat().join(' ')
      if (/unique set/i.test(flat)) return setError(t('org.duplicateGroupName'))
      setError(Object.entries(data).map(([k, v]) => `${k}: ${[v].flat().join(' ')}`).join(' · '))
    },
  })

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/groups/${id}/`),
    onSuccess: () => { refresh(); toast.success(t('admin.saved')) },
  })

  const centersForForm = clubs.find((c) => String(c.id) === form.club)?.centers ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('org.groups')}</h1>
          <p className="text-sm text-muted-foreground">{t('org.groupsSubtitle')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="size-4" />
          {t('org.newGroup')}
        </Button>
      </div>

      <Tabs defaultValue="groups">
        <TabsList>
          <TabsTrigger value="groups">{t('org.groups')}</TabsTrigger>
          <TabsTrigger value="timetable">{t('org.timetable')}</TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4 pt-4">
          {groups.length === 0 && (
            <Card><CardContent className="p-10 text-center text-muted-foreground">{t('org.noGroups')}</CardContent></Card>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                onEdit={() => { setEditing(group); setOpen(true) }}
                onDelete={() => { if (confirm(t('org.deleteGroupConfirm'))) remove.mutate(group.id) }}
                onMembers={() => setMembersFor(group)}
                onChanged={refresh}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="timetable" className="pt-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {timetable.map((day) => (
              <Card key={day.weekday}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <CalendarDays className="size-4 text-primary" />
                    {t(`org.weekday${day.weekday}`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {day.sessions.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('org.noSessionsThisDay')}</p>
                  )}
                  {day.sessions.map((session) => (
                    <div key={session.id} className="rounded-lg bg-muted/50 px-3 py-2">
                      <p className="text-sm font-semibold tabular-nums" dir="ltr">
                        {session.start_time} – {session.end_time}
                      </p>
                      <p className="truncate text-sm"><bdi>{session.group_name_en}</bdi></p>
                      {session.center_name && (
                        <p className="truncate text-xs text-muted-foreground">{session.center_name}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {t('org.memberCount', { count: session.member_count })}
                        {session.coach && ` · ${session.coach}`}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t('org.editGroup') : t('org.newGroup')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {isSuperAdmin && (
              <div className="space-y-1.5">
                <Label>{t('org.club')}</Label>
                <Select value={form.club} onValueChange={(v) => setForm({ ...form, club: v, center: NONE })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name_en}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isBranchManager ? (
              <div className="space-y-1.5">
                <Label>{t('org.center')}</Label>
                <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                  <bdi>{user?.center_name}</bdi>
                </p>
              </div>
            ) : (
            <div className="space-y-1.5">
              <Label>{t('org.center')}</Label>
              <Select value={form.center} onValueChange={(v) => setForm({ ...form, center: v })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {centersForForm.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>{c.name_en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            )}
            <div className="space-y-1.5">
              <Label>{t('org.groupNameAr')}</Label>
              <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.groupNameEn')}</Label>
              <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('org.coach')}</Label>
                <Input value={form.coach} onChange={(e) => setForm({ ...form, coach: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('org.capacity')}</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">{t('org.capacityHint')}</p>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => save.mutate()} disabled={!form.name_en.trim() || !form.name_ar.trim() || !form.club}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MembersDialog group={membersFor} onClose={() => setMembersFor(null)} onSaved={refresh} />
    </div>
  )
}

function GroupCard({ group, onEdit, onDelete, onMembers, onChanged }: {
  group: TrainingGroup
  onEdit: () => void
  onDelete: () => void
  onMembers: () => void
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const [weekday, setWeekday] = useState('0')
  const [start, setStart] = useState('17:30')
  const [end, setEnd] = useState('19:00')
  const [error, setError] = useState<string | null>(null)

  const addSession = useMutation({
    mutationFn: async () =>
      (await api.post(`/admin/groups/${group.id}/sessions/`, {
        weekday: Number(weekday), start_time: start, end_time: end,
      })).data,
    onSuccess: () => { setError(null); onChanged(); toast.success(t('admin.saved')) },
    onError: () => setError(t('org.sessionOverlap')),
  })

  const removeSession = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/sessions/${id}/`),
    onSuccess: onChanged,
  })

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-semibold"><bdi>{group.name_en}</bdi></p>
            <p className="truncate text-sm text-muted-foreground"><bdi>{group.name_ar}</bdi></p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{t('org.memberCount', { count: group.member_count })}</Badge>
              {group.center_name && <Badge variant="secondary">{group.center_name}</Badge>}
              {group.coach && <Badge variant="outline">{group.coach}</Badge>}
              {group.capacity > 0 && group.member_count >= group.capacity && (
                <Badge>{t('org.full')}</Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center">
            <Button size="icon" variant="ghost" onClick={onMembers} title={t('org.manageMembers')}>
              <Users className="size-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="size-3.5" />
            {t('org.sessions')}
          </p>
          {group.sessions.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('org.noSessions')}</p>
          )}
          {group.sessions.map((session) => (
            <div key={session.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5">
              <span className="text-sm">{t(`org.weekday${session.weekday}`)}</span>
              <span className="text-sm font-semibold tabular-nums" dir="ltr">
                {session.start_time} – {session.end_time}
              </span>
              <Button size="icon" variant="ghost" onClick={() => removeSession.mutate(session.id)}>
                <Trash2 className="size-3.5 text-destructive" />
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap items-end gap-2 pt-1">
            <div className="space-y-1">
              <Label className="text-xs">{t('org.weekday')}</Label>
              <Select value={weekday} onValueChange={setWeekday}>
                <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                    <SelectItem key={d} value={String(d)}>{t(`org.weekday${d}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('org.startTime')}</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-28" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{t('org.endTime')}</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-28" />
            </div>
            <Button size="sm" variant="secondary" onClick={() => addSession.mutate()}>
              <Plus className="size-4" />
              {t('org.addSession')}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

function MembersDialog({ group, onClose, onSaved }: {
  group: TrainingGroup | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [picked, setPicked] = useState<number[]>([])

  useEffect(() => {
    setPicked(group ? group.members.map((m) => m.id) : [])
  }, [group])

  // Only candidates of this group's club can join it.
  const { data } = useQuery({
    queryKey: ['group-candidates', group?.club],
    queryFn: async () =>
      (await api.get<Paginated<RegistrationListItem>>('/admin/registrations/', {
        params: { club: group?.club },
      })).data,
    enabled: !!group,
  })

  const save = useMutation({
    mutationFn: async () => (await api.post(`/admin/groups/${group!.id}/members/`, { ids: picked })).data,
    onSuccess: () => { onSaved(); onClose(); toast.success(t('admin.saved')) },
    onError: () => toast.error(t('register.genericError')),
  })

  const candidates = data?.results ?? []

  return (
    <Dialog open={group !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('org.manageMembers')}{group ? ` — ${group.name_en}` : ''}</DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          {candidates.length === 0 && <p className="text-sm text-muted-foreground">{t('admin.noResults')}</p>}
          {candidates.map((candidate) => (
            <label
              key={candidate.id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
            >
              <Checkbox
                checked={picked.includes(candidate.id)}
                onCheckedChange={() =>
                  setPicked((prev) =>
                    prev.includes(candidate.id)
                      ? prev.filter((id) => id !== candidate.id)
                      : [...prev, candidate.id],
                  )
                }
              />
              <span className="min-w-0 flex-1 truncate text-sm">
                <bdi>{candidate.first_name} {candidate.last_name}</bdi>
                <span className="ms-2 text-xs text-muted-foreground">{candidate.category_display}</span>
              </span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{candidate.reference}</span>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save.mutate()}>
            {t('org.saveMembers')} ({picked.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
