import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Building2, MapPin, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { Club, Wilaya } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface ClubForm {
  wilaya: string
  name_ar: string
  name_en: string
  address: string
  phone: string
  email: string
}

const EMPTY_CLUB: ClubForm = { wilaya: '', name_ar: '', name_en: '', address: '', phone: '', email: '' }

export default function AdminClubs() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [clubOpen, setClubOpen] = useState(false)
  const [editing, setEditing] = useState<Club | null>(null)
  const [form, setForm] = useState<ClubForm>(EMPTY_CLUB)
  const [centerFor, setCenterFor] = useState<Club | null>(null)
  const [centerAr, setCenterAr] = useState('')
  const [centerEn, setCenterEn] = useState('')

  const { data: wilayas = [] } = useQuery({
    queryKey: ['wilayas'],
    queryFn: async () => (await api.get<Wilaya[]>('/admin/wilayas/')).data,
  })
  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => (await api.get<Club[]>('/admin/clubs/')).data,
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['clubs'] })

  useEffect(() => {
    if (!clubOpen) return
    setForm(
      editing
        ? {
            wilaya: String(editing.wilaya),
            name_ar: editing.name_ar,
            name_en: editing.name_en,
            address: editing.address,
            phone: editing.phone,
            email: editing.email,
          }
        : EMPTY_CLUB,
    )
  }, [clubOpen, editing])

  const saveClub = useMutation({
    mutationFn: async () => {
      const payload = { ...form, wilaya: Number(form.wilaya) }
      if (editing) return (await api.patch(`/admin/clubs/${editing.id}/`, payload)).data
      return (await api.post('/admin/clubs/', payload)).data
    },
    onSuccess: () => { invalidate(); setClubOpen(false); setEditing(null); toast.success(t('admin.saved')) },
    onError: () => toast.error(t('register.genericError')),
  })

  const deleteClub = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/clubs/${id}/`),
    onSuccess: () => { invalidate(); toast.success(t('admin.saved')) },
    onError: () => toast.error(t('register.genericError')),
  })

  const addCenter = useMutation({
    mutationFn: async () =>
      (await api.post('/admin/centers/', { club: centerFor!.id, name_ar: centerAr, name_en: centerEn })).data,
    onSuccess: () => {
      invalidate(); setCenterFor(null); setCenterAr(''); setCenterEn(''); toast.success(t('admin.saved'))
    },
  })

  const deleteCenter = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/centers/${id}/`),
    onSuccess: invalidate,
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('org.clubs')}</h1>
          <p className="text-sm text-muted-foreground">{t('org.clubsSubtitle')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setClubOpen(true) }}>
          <Plus className="size-4" />{t('org.newClub')}
        </Button>
      </div>

      {clubs.length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">{t('org.noClubs')}</CardContent></Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {clubs.map((club) => (
          <Card key={club.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <Building2 className="size-5 text-primary" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{club.name_en}</p>
                    <p className="truncate text-sm text-muted-foreground" dir="rtl">{club.name_ar}</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      <bdi>{club.wilaya_name_en}</bdi>
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(club); setClubOpen(true) }}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => { if (confirm(t('org.deleteClubConfirm'))) deleteClub.mutate(club.id) }}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  <Users className="size-3" />
                  {club.registration_count} {t('org.members')}
                </Badge>
                <Badge variant={club.owner_username ? 'default' : 'secondary'}>
                  {club.owner_username
                    ? `${t('org.owner')}: ${club.owner_name || club.owner_username}`
                    : t('org.noOwner')}
                </Badge>
              </div>

              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{t('org.centers')}</p>
                  <Button size="sm" variant="ghost" onClick={() => setCenterFor(club)}>
                    <Plus className="size-3.5" />{t('org.addCenter')}
                  </Button>
                </div>
                {club.centers.length === 0 ? (
                  <p className="text-xs text-muted-foreground">{t('org.noCenters')}</p>
                ) : (
                  <ul className="space-y-1">
                    {club.centers.map((center) => (
                      <li key={center.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-1.5 text-sm">
                        <span className="flex min-w-0 items-baseline gap-2 truncate">
                          <span className="truncate">{center.name_en}</span>
                          <bdi className="truncate text-xs text-muted-foreground">{center.name_ar}</bdi>
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          onClick={() => { if (confirm(t('org.deleteCenterConfirm'))) deleteCenter.mutate(center.id) }}
                        >
                          <Trash2 className="size-3.5 text-destructive" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={clubOpen} onOpenChange={(open) => { setClubOpen(open); if (!open) setEditing(null) }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? t('org.editClub') : t('org.newClub')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('org.wilaya')}</Label>
              <Select value={form.wilaya} onValueChange={(v) => setForm({ ...form, wilaya: v })}>
                <SelectTrigger className="w-full"><SelectValue placeholder={t('org.wilaya')} /></SelectTrigger>
                <SelectContent className="max-h-72">
                  {wilayas.map((w) => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {String(w.code).padStart(2, '0')} — {w.name_en} · {w.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.clubNameEn')}</Label>
              <Input value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.clubNameAr')}</Label>
              <Input dir="rtl" value={form.name_ar} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.address')}</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('org.phone')}</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('org.email')}</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClubOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => saveClub.mutate()}
              disabled={!form.wilaya || !form.name_en.trim() || !form.name_ar.trim()}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={centerFor !== null} onOpenChange={(open) => !open && setCenterFor(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('org.addCenter')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{centerFor?.name_en}</p>
            <div className="space-y-1.5">
              <Label>{t('org.centerNameEn')}</Label>
              <Input value={centerEn} onChange={(e) => setCenterEn(e.target.value)} placeholder="Khafji" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.centerNameAr')}</Label>
              <Input dir="rtl" value={centerAr} onChange={(e) => setCenterAr(e.target.value)} placeholder="خفجي" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCenterFor(null)}>{t('common.cancel')}</Button>
            <Button onClick={() => addCenter.mutate()} disabled={!centerEn.trim() || !centerAr.trim()}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
