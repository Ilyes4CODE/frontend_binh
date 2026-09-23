import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { GitBranch, Pencil, Plus, Power, PowerOff, ShieldCheck, Trash2, UserCog } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { AdminUser, Club, UserRole } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/PasswordInput'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface UserForm {
  email: string
  password: string
  full_name: string
  phone: string
  role: UserRole
  club: string
  center: string
}

const EMPTY: UserForm = {
  email: '', password: '', full_name: '', phone: '', role: 'CLUB_OWNER', club: '', center: '',
}

export default function AdminUsers() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminUser | null>(null)
  const [form, setForm] = useState<UserForm>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => (await api.get<AdminUser[]>('/admin/users/')).data,
  })
  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => (await api.get<Club[]>('/admin/clubs/')).data,
  })

  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      editing
        ? {
            email: editing.email,
            password: '',
            full_name: editing.full_name,
            phone: editing.phone,
            role: editing.role,
            club: editing.club ? String(editing.club) : '',
            center: editing.center ? String(editing.center) : '',
          }
        : EMPTY,
    )
  }, [open, editing])

  const save = useMutation({
    mutationFn: async () => {
      // The backend mirrors the email into the username, so it is not sent.
      const payload: Record<string, unknown> = {
        email: form.email,
        full_name: form.full_name,
        phone: form.phone,
        role: form.role,
        // A branch manager's club follows from their branch on the server.
        club: form.role === 'CLUB_OWNER' && form.club ? Number(form.club) : null,
        center: form.role === 'BRANCH_MANAGER' && form.center ? Number(form.center) : null,
      }
      if (form.password) payload.password = form.password
      if (editing) return (await api.patch(`/admin/users/${editing.id}/`, payload)).data
      return (await api.post('/admin/users/', payload)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setOpen(false); setEditing(null); toast.success(t('admin.saved'))
    },
    onError: (err: any) => {
      const data = err?.response?.data
      setError(
        typeof data === 'object'
          ? Object.entries(data).map(([k, v]) => `${k}: ${[v].flat().join(' ')}`).join(' · ')
          : t('register.genericError'),
      )
    },
  })

  const toggleActive = useMutation({
    mutationFn: async (u: AdminUser) => api.patch(`/admin/users/${u.id}/`, { is_active: !u.is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(t('admin.saved'))
    },
    onError: () => toast.error(t('register.genericError')),
  })

  // Branches of the club chosen in the form, for assigning a branch manager.
  const branchOptions = clubs.find((c) => String(c.id) === form.club)?.centers ?? []

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/users/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      toast.success(t('admin.saved'))
    },
    onError: () => toast.error(t('register.genericError')),
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('org.users')}</h1>
          <p className="text-sm text-muted-foreground">{t('org.usersSubtitle')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="size-4" />{t('org.newUser')}
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('org.username')}</TableHead>
                <TableHead>{t('org.fullName')}</TableHead>
                <TableHead>{t('org.role')}</TableHead>
                <TableHead>{t('org.club')}</TableHead>
                <TableHead>{t('org.lastLogin')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell className="text-muted-foreground">{u.full_name || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === 'SUPER_ADMIN' ? 'default' : 'secondary'}>
                      {u.role === 'SUPER_ADMIN' ? <ShieldCheck className="size-3" />
                        : u.role === 'BRANCH_MANAGER' ? <GitBranch className="size-3" />
                        : <UserCog className="size-3" />}
                      {t(`org.role${u.role}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    <bdi>{u.club_name || '—'}</bdi>
                    {u.center_name && <span className="block text-xs"><bdi>{u.center_name}</bdi></span>}
                    {!u.is_active && <Badge variant="outline" className="mt-1">{t('hier.inactive')}</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : t('org.never')}
                  </TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(u); setOpen(true) }}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      title={u.is_active ? t('hier.deactivate') : t('hier.reactivate')}
                      disabled={u.username === currentUser?.username}
                      onClick={() => toggleActive.mutate(u)}
                    >
                      {u.is_active ? <PowerOff className="size-4" /> : <Power className="size-4 text-primary" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      // You cannot delete the account you are signed in with.
                      disabled={u.username === currentUser?.username}
                      onClick={() => { if (confirm(t('org.deleteUserConfirm'))) remove.mutate(u.id) }}
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

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? t('org.editUser') : t('org.newUser')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t('org.email')}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="owner@club.dz"
              />
              <p className="text-xs text-muted-foreground">{t('org.emailIsLogin')}</p>
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.fullName')}</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.phone')}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.password')}</Label>
              <PasswordInput
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {editing && <p className="text-xs text-muted-foreground">{t('org.passwordKeepHint')}</p>}
            </div>
            <div className="space-y-1.5">
              <Label>{t('org.role')}</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPER_ADMIN">{t('org.roleSUPER_ADMIN')}</SelectItem>
                  <SelectItem value="CLUB_OWNER">{t('org.roleCLUB_OWNER')}</SelectItem>
                  <SelectItem value="BRANCH_MANAGER">{t('org.roleBRANCH_MANAGER')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{t('org.roleHint')}</p>
            </div>
            {(form.role === 'CLUB_OWNER' || form.role === 'BRANCH_MANAGER') && (
              <div className="space-y-1.5">
                <Label>{t('org.club')}</Label>
                <Select value={form.club} onValueChange={(v) => setForm({ ...form, club: v, center: '' })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t('org.selectClub')} /></SelectTrigger>
                  <SelectContent>
                    {clubs.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name_en} — {c.wilaya_name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.role === 'BRANCH_MANAGER' && (
              <div className="space-y-1.5">
                <Label>{t('org.center')}</Label>
                <Select value={form.center} onValueChange={(v) => setForm({ ...form, center: v })}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={t('hier.pickBranch')} /></SelectTrigger>
                  <SelectContent>
                    {branchOptions.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name_en}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button
              onClick={() => save.mutate()}
              disabled={
                !form.email.trim() ||
                (!editing && !form.password) ||
                (form.role === 'CLUB_OWNER' && !form.club) ||
                (form.role === 'BRANCH_MANAGER' && !form.center)
              }
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
