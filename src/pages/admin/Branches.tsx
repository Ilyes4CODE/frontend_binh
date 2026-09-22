import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  GitBranch, KeyRound, MapPin, Pencil, Plus, Power, PowerOff, Trash2, UserPlus, Users,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { BranchManagerSummary, Center, Club } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

/** Flattens a DRF error body into one readable line. */
function errorText(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data
  if (!data || typeof data !== 'object') return fallback
  return Object.values(data as Record<string, unknown>).flat().join(' ') || fallback
}

/**
 * A club president's branches (فروع) and the people who run them.
 *
 * The president opens branches in their own club and gives each one a manager
 * account — the manager then signs in with that email and password and sees
 * their branch only. The national administrator sees the same screen for any
 * club, picked from the list at the top.
 */
export default function AdminBranches() {
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperAdmin = user?.is_super_admin ?? false
  const ar = i18n.language === 'ar'

  // A president is fixed to their club; the national admin chooses one.
  const [clubId, setClubId] = useState<string>(user?.club ? String(user.club) : '')
  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => (await api.get<Club[]>('/admin/clubs/')).data,
    enabled: isSuperAdmin,
  })
  useEffect(() => {
    if (isSuperAdmin && !clubId && clubs.length) setClubId(String(clubs[0].id))
  }, [isSuperAdmin, clubId, clubs])

  const branches = useQuery({
    queryKey: ['branches', clubId],
    queryFn: async () =>
      (await api.get<Center[]>('/admin/centers/', { params: clubId ? { club: clubId } : {} })).data,
    enabled: Boolean(clubId) || !isSuperAdmin,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['branches'] })
    queryClient.invalidateQueries({ queryKey: ['clubs'] })
    queryClient.invalidateQueries({ queryKey: ['activity'] })
  }

  const [branchDialog, setBranchDialog] = useState<{ open: boolean; editing: Center | null }>(
    { open: false, editing: null })
  const [managerFor, setManagerFor] = useState<Center | null>(null)
  const [resetFor, setResetFor] = useState<BranchManagerSummary | null>(null)

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/centers/${id}/`),
    onSuccess: () => { refresh(); toast.success(t('admin.saved')) },
    onError: (err) => toast.error(errorText(err, t('register.genericError'))),
  })

  const toggleActive = useMutation({
    mutationFn: async (manager: BranchManagerSummary) =>
      api.patch(`/admin/users/${manager.id}/`, { is_active: !manager.is_active }),
    onSuccess: () => { refresh(); toast.success(t('admin.saved')) },
    onError: (err) => toast.error(errorText(err, t('register.genericError'))),
  })

  const rows = branches.data ?? []
  const clubName = isSuperAdmin
    ? clubs.find((c) => String(c.id) === clubId)?.[ar ? 'name_ar' : 'name_en']
    : (ar ? user?.club_name_ar : user?.club_name)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <GitBranch className="size-5 text-primary" />
            {t('hier.branches')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t('hier.branchesSubtitle')}
            {clubName && <> · <bdi className="font-medium text-foreground">{clubName}</bdi></>}
          </p>
        </div>
        <Button
          onClick={() => setBranchDialog({ open: true, editing: null })}
          disabled={isSuperAdmin && !clubId}
        >
          <Plus className="size-4" />
          {t('hier.newBranch')}
        </Button>
      </div>

      {isSuperAdmin && (
        <div className="max-w-xs space-y-1.5">
          <Label>{t('org.club')}</Label>
          <Select value={clubId} onValueChange={setClubId}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {clubs.map((club) => (
                <SelectItem key={club.id} value={String(club.id)}>
                  {club.wilaya_name_en} · {club.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {branches.isSuccess && rows.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">{t('hier.noBranches')}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {rows.map((branch) => (
          <Card key={branch.id}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-semibold">
                      <bdi>{ar ? branch.name_ar : branch.name_en}</bdi>
                    </h2>
                    {!branch.active && <Badge variant="outline">{t('hier.inactive')}</Badge>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">
                    <bdi>{ar ? branch.name_en : branch.name_ar}</bdi>
                  </p>
                  {branch.address && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> <bdi>{branch.address}</bdi>
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <Button size="icon" variant="ghost" title={t('common.edit')}
                    onClick={() => setBranchDialog({ open: true, editing: branch })}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button size="icon" variant="ghost" title={t('common.delete')}
                    onClick={() => { if (confirm(t('hier.deleteBranchConfirm'))) remove.mutate(branch.id) }}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Users className="size-4 text-muted-foreground" />
                {t('hier.candidateCount', { count: branch.registration_count ?? 0 })}
              </div>

              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('hier.managers')}
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setManagerFor(branch)}>
                    <UserPlus className="size-4" />
                    {t('hier.addManager')}
                  </Button>
                </div>

                {(branch.managers ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">{t('hier.noManager')}</p>
                )}
                {(branch.managers ?? []).map((manager) => (
                  <div key={manager.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-background px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        <bdi>{manager.full_name || manager.email}</bdi>
                      </p>
                      <p className="truncate text-xs text-muted-foreground" dir="ltr">{manager.email}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant={manager.is_active ? 'secondary' : 'outline'}>
                        {manager.is_active ? t('hier.active') : t('hier.inactive')}
                      </Badge>
                      <Button size="icon" variant="ghost" title={t('hier.resetPassword')}
                        onClick={() => setResetFor(manager)}>
                        <KeyRound className="size-4" />
                      </Button>
                      <Button size="icon" variant="ghost"
                        title={manager.is_active ? t('hier.deactivate') : t('hier.reactivate')}
                        onClick={() => toggleActive.mutate(manager)}>
                        {manager.is_active
                          ? <PowerOff className="size-4 text-destructive" />
                          : <Power className="size-4 text-primary" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <BranchDialog
        state={branchDialog}
        clubId={clubId}
        onClose={() => setBranchDialog({ open: false, editing: null })}
        onSaved={refresh}
      />
      <ManagerDialog branch={managerFor} onClose={() => setManagerFor(null)} onSaved={refresh} />
      <ResetPasswordDialog manager={resetFor} onClose={() => setResetFor(null)} onSaved={refresh} />
    </div>
  )
}

function BranchDialog({ state, clubId, onClose, onSaved }: {
  state: { open: boolean; editing: Center | null }
  clubId: string
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [nameAr, setNameAr] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!state.open) return
    setError(null)
    setNameAr(state.editing?.name_ar ?? '')
    setNameEn(state.editing?.name_en ?? '')
    setAddress(state.editing?.address ?? '')
  }, [state])

  const save = useMutation({
    mutationFn: async () => {
      // The server pins a president's branches to their own club regardless.
      const payload = { club: Number(clubId) || undefined, name_ar: nameAr, name_en: nameEn, address, active: true }
      if (state.editing) return (await api.patch(`/admin/centers/${state.editing.id}/`, payload)).data
      return (await api.post('/admin/centers/', payload)).data
    },
    onSuccess: () => { onSaved(); onClose(); toast.success(t('admin.saved')) },
    onError: (err) => setError(errorText(err, t('register.genericError'))),
  })

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{state.editing ? t('hier.editBranch') : t('hier.newBranch')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="branch-ar">{t('hier.branchNameAr')}</Label>
            <Input id="branch-ar" dir="rtl" value={nameAr} onChange={(e) => setNameAr(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-en">{t('hier.branchNameEn')}</Label>
            <Input id="branch-en" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="branch-address">{t('hier.address')}</Label>
            <Input id="branch-address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save.mutate()} disabled={!nameAr.trim() || !nameEn.trim() || save.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ManagerDialog({ branch, onClose, onSaved }: {
  branch: Center | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!branch) return
    setFullName(''); setEmail(''); setPhone(''); setPassword(''); setError(null)
  }, [branch])

  const save = useMutation({
    mutationFn: async () =>
      (await api.post('/admin/users/', {
        role: 'BRANCH_MANAGER', center: branch!.id,
        full_name: fullName, email, phone, password,
      })).data,
    onSuccess: () => { onSaved(); onClose(); toast.success(t('hier.managerCreated')) },
    onError: (err) => setError(errorText(err, t('register.genericError'))),
  })

  return (
    <Dialog open={branch !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('hier.addManager')}</DialogTitle>
          <DialogDescription>
            {t('hier.addManagerHint', { branch: branch?.name_en ?? '' })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="mgr-name">{t('hier.fullName')}</Label>
            <Input id="mgr-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mgr-email">{t('hier.email')}</Label>
            <Input id="mgr-email" type="email" dir="ltr" autoComplete="off"
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mgr-phone">{t('hier.phone')}</Label>
            <Input id="mgr-phone" dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mgr-password">{t('hier.password')}</Label>
            <Input id="mgr-password" type="password" dir="ltr" autoComplete="new-password"
              value={password} onChange={(e) => setPassword(e.target.value)} />
            <p className="text-xs text-muted-foreground">{t('hier.passwordHint')}</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save.mutate()}
            disabled={!email.trim() || password.length < 8 || save.isPending}>
            {t('hier.createAccount')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordDialog({ manager, onClose, onSaved }: {
  manager: BranchManagerSummary | null
  onClose: () => void
  onSaved: () => void
}) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { setPassword(''); setError(null) }, [manager])

  const save = useMutation({
    mutationFn: async () => api.patch(`/admin/users/${manager!.id}/`, { password }),
    onSuccess: () => { onSaved(); onClose(); toast.success(t('hier.passwordReset')) },
    onError: (err) => setError(errorText(err, t('register.genericError'))),
  })

  return (
    <Dialog open={manager !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('hier.resetPassword')}</DialogTitle>
          <DialogDescription><bdi dir="ltr">{manager?.email}</bdi></DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="reset-password">{t('hier.newPassword')}</Label>
          <Input id="reset-password" type="password" dir="ltr" autoComplete="new-password"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="text-xs text-muted-foreground">{t('hier.passwordHint')}</p>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={() => save.mutate()} disabled={password.length < 8 || save.isPending}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
