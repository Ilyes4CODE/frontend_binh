import { useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { categorize } from '@/lib/categorize'
import { Illustration } from '@/components/Illustration'
import type { Directory, RequiredDocumentPublic, SiteSettings } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    first_name: z.string().min(1),
    last_name: z.string().min(1),
    latin_full_name: z.string().min(1),
    gender: z.enum(['MALE', 'FEMALE']),
    birth_date: z.string().min(1),
    birth_place: z.string().min(1),
    address: z.string().min(1),
    phone: z.string().min(6),
    education_level: z.string().optional(),
    institution: z.string().optional(),
    parent_name: z.string().optional(),
    parent_id_type: z.string().optional(),
    parent_id_number: z.string().optional(),
    parent_id_issue_date: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.birth_date) return
    const { isMinor } = categorize(data.birth_date)
    if (isMinor) {
      if (!data.parent_name) ctx.addIssue({ code: 'custom', path: ['parent_name'], message: 'required' })
      if (!data.parent_id_type) ctx.addIssue({ code: 'custom', path: ['parent_id_type'], message: 'required' })
      if (!data.parent_id_number) ctx.addIssue({ code: 'custom', path: ['parent_id_number'], message: 'required' })
      if (!data.parent_id_issue_date) ctx.addIssue({ code: 'custom', path: ['parent_id_issue_date'], message: 'required' })
    }
  })

type FormValues = z.infer<typeof schema>

const PERSONAL_FIELDS = [
  'first_name', 'last_name', 'latin_full_name', 'gender', 'birth_date',
  'birth_place', 'address', 'phone', 'education_level', 'institution',
] as const
const PARENT_FIELDS = ['parent_name', 'parent_id_type', 'parent_id_number', 'parent_id_issue_date'] as const

export default function Register() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [stepIndex, setStepIndex] = useState(0)
  const [wilayaId, setWilayaId] = useState('')
  const [clubId, setClubId] = useState('')
  const [centerId, setCenterId] = useState('')
  const [clubError, setClubError] = useState<string | null>(null)
  const [files, setFiles] = useState<Record<string, File | undefined>>({})
  const [documentsError, setDocumentsError] = useState<string | null>(null)
  const [reviewConfirmed, setReviewConfirmed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), mode: 'onChange' })

  const birthDate = watch('birth_date')
  const info = useMemo(() => (birthDate ? categorize(birthDate) : null), [birthDate])
  const isMinor = info?.isMinor ?? false

  const steps = useMemo(
    () => ['personal', 'category', ...(isMinor ? ['parent'] : []), 'documents', 'review'] as const,
    [isMinor],
  )
  const currentStep = steps[stepIndex] ?? 'personal'

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<SiteSettings>('/settings/')).data,
  })

  const { data: directory } = useQuery({
    queryKey: ['directory'],
    queryFn: async () => (await api.get<Directory>('/directory/')).data,
  })

  const clubsInWilaya = (directory?.clubs ?? []).filter((c) => String(c.wilaya) === wilayaId)
  const selectedClub = (directory?.clubs ?? []).find((c) => String(c.id) === clubId)

  const { data: requiredDocuments = [] } = useQuery({
    queryKey: ['required-documents', isMinor],
    queryFn: async () =>
      (await api.get<RequiredDocumentPublic[]>('/required-documents/', { params: { is_minor: isMinor } })).data,
    enabled: !!birthDate,
  })

  const labelFor = (doc: RequiredDocumentPublic) => {
    if (i18n.language === 'ar') return doc.label_ar
    if (i18n.language === 'vi') return doc.label_vi
    return doc.label_en
  }

  async function goNext() {
    if (currentStep === 'personal') {
      if (!clubId) {
        setClubError(t('register.clubRequired'))
        return
      }
      const valid = await trigger(PERSONAL_FIELDS as unknown as (keyof FormValues)[])
      if (!valid) return
    }
    if (currentStep === 'parent') {
      const valid = await trigger(PARENT_FIELDS as unknown as (keyof FormValues)[])
      if (!valid) return
    }
    if (currentStep === 'documents') {
      const missing = requiredDocuments.filter((d) => d.required && !files[d.key])
      if (missing.length > 0) {
        setDocumentsError(`${t('register.submitError')} (${missing.map(labelFor).join(', ')})`)
        return
      }
      setDocumentsError(null)
    }
    setStepIndex((i) => Math.min(i + 1, steps.length - 1))
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0))
  }

  const onSubmit = handleSubmit(async (data) => {
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('club', clubId)
      if (centerId) formData.append('center', centerId)
      for (const [key, value] of Object.entries(data)) {
        if (value) formData.append(key, value as string)
      }
      for (const doc of requiredDocuments) {
        const file = files[doc.key]
        if (file) formData.append(`doc_${doc.key}`, file)
      }
      const { data: created } = await api.post('/registrations/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(t('register.submitSuccess'))
      navigate(`/register/${created.reference}`)
    } catch (err: any) {
      const detail = err?.response?.data
      // The admin may have closed registrations while this form was being filled.
      if (detail?.code === 'REGISTRATIONS_CLOSED') {
        toast.error(t('register.closedTitle'))
        queryClient.invalidateQueries({ queryKey: ['settings'] })
      } else if (detail && typeof detail === 'object') {
        const messages = Object.values(detail).flat().join(' ')
        toast.error(messages || t('register.genericError'))
      } else {
        toast.error(t('register.genericError'))
      }
    } finally {
      setSubmitting(false)
    }
  })

  if (settingsLoading) {
    return <p className="p-12 text-center text-muted-foreground">{t('common.loading')}</p>
  }

  // The admin controls the registration window from the dashboard.
  if (settings && !settings.registrations_open) {
    const custom =
      i18n.language === 'ar' ? settings.closed_message_ar
      : i18n.language === 'vi' ? settings.closed_message_vi
      : settings.closed_message_en
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Illustration src="/illustrations/registrations-closed.png" alt="" className="mx-auto w-56" />
        <h1 className="mt-6 text-2xl font-bold">{t('register.closedTitle')}</h1>
        <p className="mt-3 text-muted-foreground">{custom?.trim() || t('register.closedBody')}</p>
        <Button asChild variant="outline" size="lg" className="mt-8">
          <Link to="/">{t('confirmation.backHome')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <img src="/logo.png" alt={t('common.clubName')} className="mx-auto size-14 rounded-full shadow-sm" />
      <h1 className="mt-3 text-center text-2xl font-bold">{t('register.title')}</h1>

      <ol className="mt-8 flex items-center justify-between gap-1">
        {steps.map((step, i) => (
          <li key={step} className="flex flex-1 items-center gap-1">
            <span
              className={cn(
                'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors duration-300',
                i < stepIndex ? 'bg-primary text-primary-foreground' : i === stepIndex ? 'scale-110 bg-brand-gold text-brand-gold-foreground' : 'bg-muted text-muted-foreground',
                'transition-[colors,transform] duration-300',
              )}
            >
              {i < stepIndex ? <Check className="size-4 animate-in zoom-in duration-200" /> : i + 1}
            </span>
            {i < steps.length - 1 && (
              <span className="relative h-0.5 flex-1 overflow-hidden bg-border">
                <span
                  className={cn(
                    'absolute inset-y-0 start-0 bg-primary transition-[width] duration-300 ease-out',
                    i < stepIndex ? 'w-full' : 'w-0',
                  )}
                />
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-2 text-center text-sm font-medium text-muted-foreground">
        {t(`register.step${currentStep[0].toUpperCase()}${currentStep.slice(1)}`)}
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        {/* keyed on the step so each panel re-mounts and replays its entrance */}
        <div key={currentStep} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {currentStep === 'personal' && (
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold">{t('register.clubSection')}</p>
                {(directory?.clubs.length ?? 0) === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('register.noClubsAvailable')}</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>{t('register.selectWilaya')}</Label>
                      <Select
                        value={wilayaId}
                        onValueChange={(v) => { setWilayaId(v); setClubId(''); setCenterId('') }}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder={t('register.selectWilaya')} /></SelectTrigger>
                        <SelectContent className="max-h-72">
                          {(directory?.wilayas ?? []).map((w) => (
                            <SelectItem key={w.id} value={String(w.id)}>
                              {i18n.language === 'ar' ? w.name_ar : w.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('register.selectClub')}</Label>
                      <Select
                        value={clubId}
                        onValueChange={(v) => { setClubId(v); setCenterId(''); setClubError(null) }}
                        disabled={!wilayaId}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder={t('register.selectClub')} /></SelectTrigger>
                        <SelectContent>
                          {clubsInWilaya.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {i18n.language === 'ar' ? c.name_ar : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('register.selectCenter')}</Label>
                      <Select
                        value={centerId}
                        onValueChange={setCenterId}
                        disabled={!selectedClub || selectedClub.centers.length === 0}
                      >
                        <SelectTrigger className="w-full"><SelectValue placeholder={t('register.selectCenter')} /></SelectTrigger>
                        <SelectContent>
                          {(selectedClub?.centers ?? []).map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {i18n.language === 'ar' ? c.name_ar : c.name_en}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                {clubError && <p className="text-sm text-destructive">{clubError}</p>}
              </div>

              <TextField label={t('register.firstName')} error={errors.first_name} {...register('first_name')} />
              <TextField label={t('register.lastName')} error={errors.last_name} {...register('last_name')} />
              <TextField
                label={t('register.latinFullName')}
                error={errors.latin_full_name}
                className="sm:col-span-2"
                {...register('latin_full_name')}
              />
              <div className="space-y-1.5">
                <Label>{t('register.gender')}</Label>
                <Controller
                  control={control}
                  name="gender"
                  render={({ field }) => (
                    <div className="flex gap-2">
                      {(['MALE', 'FEMALE'] as const).map((value) => (
                        <Button
                          key={value}
                          type="button"
                          variant={field.value === value ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => field.onChange(value)}
                        >
                          {t(`register.gender${value}`)}
                        </Button>
                      ))}
                    </div>
                  )}
                />
                {errors.gender && <p className="text-xs text-destructive">{t('register.genderRequired')}</p>}
              </div>
              <TextField type="date" label={t('register.birthDate')} error={errors.birth_date} {...register('birth_date')} />
              <TextField label={t('register.birthPlace')} error={errors.birth_place} {...register('birth_place')} />
              <TextField label={t('register.address')} className="sm:col-span-2" error={errors.address} {...register('address')} />
              <TextField label={t('register.phone')} error={errors.phone} {...register('phone')} />
              <TextField label={t('register.educationLevel')} error={errors.education_level} {...register('education_level')} />
              <TextField
                label={t('register.institution')}
                className="sm:col-span-2"
                error={errors.institution}
                {...register('institution')}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 'category' && info && (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <span className="animate-in rounded-full bg-brand-gold px-6 py-2 text-lg font-bold text-brand-gold-foreground zoom-in-95 fade-in duration-400">
                {t(`categories.${info.category}`)}
              </span>
              <p className="text-sm text-muted-foreground">
                {t('register.computedAge')}: {info.age}
              </p>
              <p className={cn('rounded-md p-3 text-sm', isMinor ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground')}>
                {isMinor ? t('register.minorNotice') : t('register.majorNotice')}
              </p>
            </CardContent>
          </Card>
        )}

        {currentStep === 'parent' && (
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <TextField
                label={t('register.parentName')}
                className="sm:col-span-2"
                error={errors.parent_name}
                {...register('parent_name')}
              />
              <div className="space-y-1.5">
                <Label>{t('register.parentIdType')}</Label>
                <Controller
                  control={control}
                  name="parent_id_type"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('register.parentIdType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CNI">{t('register.parentIdTypeCNI')}</SelectItem>
                        <SelectItem value="PERMIS">{t('register.parentIdTypePERMIS')}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.parent_id_type && <p className="text-xs text-destructive">{t('register.submitError')}</p>}
              </div>
              <TextField label={t('register.parentIdNumber')} error={errors.parent_id_number} {...register('parent_id_number')} />
              <TextField
                type="date"
                label={t('register.parentIdIssueDate')}
                error={errors.parent_id_issue_date}
                {...register('parent_id_issue_date')}
              />
            </CardContent>
          </Card>
        )}

        {currentStep === 'documents' && (
          <Card>
            <CardContent className="space-y-4 p-6">
              <div>
                <h3 className="font-semibold">{t('register.documentsTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('register.documentsSubtitle')}</p>
              </div>
              {requiredDocuments.map((doc) => (
                <div key={doc.key} className="space-y-1.5">
                  <Label htmlFor={`file-${doc.key}`}>
                    {labelFor(doc)}
                    {!doc.required && <span className="ms-1 text-xs text-muted-foreground">({t('register.documentOptional')})</span>}
                  </Label>
                  <Input
                    id={`file-${doc.key}`}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setFiles((prev) => ({ ...prev, [doc.key]: e.target.files?.[0] }))}
                  />
                </div>
              ))}
              {documentsError && <p className="text-sm text-destructive">{documentsError}</p>}
            </CardContent>
          </Card>
        )}

        {currentStep === 'review' && info && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <h3 className="font-semibold">{t('register.reviewTitle')}</h3>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <ReviewRow label={t('register.firstName')} value={watch('first_name')} />
                <ReviewRow label={t('register.lastName')} value={watch('last_name')} />
                <ReviewRow label={t('register.gender')} value={watch('gender') ? t(`register.gender${watch('gender')}`) : ''} />
                <ReviewRow label={t('register.birthDate')} value={watch('birth_date')} />
                <ReviewRow label={t('register.phone')} value={watch('phone')} />
                <ReviewRow label={t('register.computedCategory')} value={t(`categories.${info.category}`)} />
                {isMinor && <ReviewRow label={t('register.parentName')} value={watch('parent_name')} />}
              </dl>
              <label className="flex items-center gap-2 pt-2 text-sm">
                <Checkbox checked={reviewConfirmed} onCheckedChange={(v) => setReviewConfirmed(v === true)} />
                {t('register.reviewConfirm')}
              </label>
            </CardContent>
          </Card>
        )}
        </div>

        <div className="mt-6 flex justify-between">
          <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0}>
            {t('common.back')}
          </Button>
          {currentStep === 'review' ? (
            <Button type="submit" disabled={!reviewConfirmed || submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {t('common.submit')}
            </Button>
          ) : (
            <Button type="button" onClick={goNext} disabled={currentStep === 'category' && !info}>
              {t('common.next')}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

function TextField({
  label,
  error,
  className,
  type = 'text',
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: { message?: string } }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label>{label}</Label>
      <Input type={type} {...props} />
      {error && <p className="text-xs text-destructive">{label}</p>}
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value || '—'}</dd>
    </>
  )
}
