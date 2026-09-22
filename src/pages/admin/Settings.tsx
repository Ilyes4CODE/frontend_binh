import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { DoorClosed, DoorOpen } from 'lucide-react'
import { api } from '@/lib/api'
import type { SiteSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSettings() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => (await api.get<SiteSettings>('/admin/settings/')).data,
  })

  const [season, setSeason] = useState('')
  const [closedAr, setClosedAr] = useState('')
  const [closedEn, setClosedEn] = useState('')
  const [closedVi, setClosedVi] = useState('')
  useEffect(() => {
    if (!data) return
    setSeason(data.active_season)
    setClosedAr(data.closed_message_ar)
    setClosedEn(data.closed_message_en)
    setClosedVi(data.closed_message_vi)
  }, [data])

  const save = useMutation({
    mutationFn: async (payload: Partial<SiteSettings>) =>
      (await api.patch('/admin/settings/', payload)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] })
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success(t('admin.saved'))
    },
  })

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)

  const passwordMutation = useMutation({
    mutationFn: async () =>
      (await api.post('/auth/change-password/', { current_password: currentPassword, new_password: newPassword })).data,
    onSuccess: () => {
      setCurrentPassword('')
      setNewPassword('')
      setPasswordError(null)
      toast.success(t('admin.passwordUpdated'))
    },
    onError: (err: any) => {
      setPasswordError(err?.response?.data?.current_password || err?.response?.data?.new_password || t('register.genericError'))
    },
  })

  const isOpen = data?.registrations_open ?? true

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-xl font-bold">{t('admin.settings')}</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3 text-base">
            {t('admin.registrationsOpen')}
            <Badge variant={isOpen ? 'default' : 'destructive'}>
              {isOpen
                ? <><DoorOpen className="size-3" />{t('admin.registrationsOpen')}</>
                : <><DoorClosed className="size-3" />{t('admin.registrationsClosedBadge')}</>}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-3 text-sm">
            <Switch
              checked={isOpen}
              onCheckedChange={(checked) => save.mutate({ registrations_open: checked })}
            />
            {t('admin.registrationsOpen')}
          </label>
          <p className="text-xs text-muted-foreground">{t('admin.registrationsOpenHint')}</p>

          {!isOpen && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">{t('admin.closedMessage')}</p>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('admin.docLabelAr')}</Label>
                <Input dir="rtl" value={closedAr} onChange={(e) => setClosedAr(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('admin.docLabelEn')}</Label>
                <Input value={closedEn} onChange={(e) => setClosedEn(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">{t('admin.docLabelVi')}</Label>
                <Input value={closedVi} onChange={(e) => setClosedVi(e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">{t('admin.closedMessageHint')}</p>
              <Button
                size="sm"
                onClick={() =>
                  save.mutate({
                    closed_message_ar: closedAr,
                    closed_message_en: closedEn,
                    closed_message_vi: closedVi,
                  })
                }
              >
                {t('common.save')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('admin.settingsSeason')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('admin.settingsSeason')}</Label>
            <Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="2025/2026" />
            <p className="text-xs text-muted-foreground">{t('admin.settingsSeasonHint')}</p>
          </div>
          <Button onClick={() => save.mutate({ active_season: season })}>{t('common.save')}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('admin.settingsPasswordTitle')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>{t('admin.currentPassword')}</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('admin.newPassword')}</Label>
            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
          <Button onClick={() => passwordMutation.mutate()} disabled={!currentPassword || newPassword.length < 8}>
            {t('common.save')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
