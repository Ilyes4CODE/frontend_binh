import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowRightLeft, Download, Eye, FileText, IdCard, Printer } from 'lucide-react'
import { api } from '@/lib/api'
import { DocumentViewer } from '@/components/DocumentViewer'
import type { Center, Registration } from '@/types'
import { useAuth } from '@/context/AuthContext'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default function AdminRegistrationDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [preview, setPreview] = useState<{ id: number; title: string; filename: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registration', id],
    queryFn: async () => (await api.get<Registration>(`/admin/registrations/${id}/`)).data,
    enabled: !!id,
  })

  const { user } = useAuth()
  // Moving a member between branches is the president's call, never a branch
  // manager's — the server enforces this; the control simply isn't offered.
  const canTransfer = Boolean(user && !user.is_branch_manager)
  const { data: branches = [] } = useQuery({
    queryKey: ['branches-of', data?.club],
    queryFn: async () =>
      (await api.get<Center[]>('/admin/centers/', { params: { club: data?.club } })).data,
    enabled: canTransfer && Boolean(data?.club),
  })

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<Pick<Registration, 'status' | 'payment_status' | 'center'>>) =>
      (await api.patch(`/admin/registrations/${id}/`, payload)).data,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-registration', id], updated)
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(t('admin.saved'))
    },
    onError: (err: { response?: { data?: Record<string, unknown> } }) => {
      const body = err?.response?.data
      toast.error(body ? Object.values(body).flat().join(' ') : t('register.genericError'))
    },
  })

  async function downloadDocument(docId: number, filename: string) {
    const response = await api.get(`/admin/documents/${docId}/download/`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function downloadBadge() {
    if (!data) return
    const response = await api.get(`/admin/registrations/${data.id}/badge/`, { responseType: 'blob' })
    const url = URL.createObjectURL(response.data as Blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `badge-${data.reference}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Opens the generated registration form in a new tab and sends it to the printer. */
  function printRegistrationForm() {
    if (!data) return
    const win = window.open(`/api/registrations/${data.reference}/pdf/`, '_blank')
    win?.addEventListener('load', () => win.print(), { once: true })
  }

  const labelFor = (doc: Registration['documents'][number]) => {
    if (i18n.language === 'ar') return doc.label_ar
    if (i18n.language === 'vi') return doc.label_vi
    return doc.label_en
  }

  if (isLoading || !data) return <p className="text-muted-foreground">{t('common.loading')}</p>

  const isPaid = data.payment_status === 'PAID'

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('admin.detailTitle')}</h1>
          <p className="font-mono text-sm text-muted-foreground">{data.reference}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={data.status === 'APPROVED' ? 'default' : data.status === 'REJECTED' ? 'destructive' : 'secondary'}>
            {t(`status.${data.status}`)}
          </Badge>
          <Badge variant={data.payment_status === 'PAID' ? 'default' : 'outline'}>
            {t(`status.${data.payment_status}`)}
          </Badge>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/registrations/${data.reference}/pdf/`} download>
              <Download className="size-4" />
              {t('common.downloadPdf')}
            </a>
          </Button>
          <Button variant="outline" size="sm" onClick={printRegistrationForm}>
            <Printer className="size-4" />
            {t('admin.printForm')}
          </Button>
          {/* A badge is proof of a paid membership, so it only appears once paid. */}
          <Button
            variant={isPaid ? 'default' : 'outline'}
            size="sm"
            disabled={!isPaid}
            title={isPaid ? undefined : t('admin.badgeNeedsPaid')}
            onClick={downloadBadge}
          >
            <IdCard className="size-4" />
            {t('admin.badge')}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {data.status !== 'APPROVED' && (
          <Button size="sm" onClick={() => updateMutation.mutate({ status: 'APPROVED' })}>{t('admin.markApproved')}</Button>
        )}
        {data.status !== 'REJECTED' && (
          <Button size="sm" variant="destructive" onClick={() => updateMutation.mutate({ status: 'REJECTED' })}>{t('admin.markRejected')}</Button>
        )}
        {data.status !== 'PENDING' && (
          <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ status: 'PENDING' })}>{t('admin.markPending')}</Button>
        )}
        {data.payment_status !== 'PAID' ? (
          <Button size="sm" variant="secondary" onClick={() => updateMutation.mutate({ payment_status: 'PAID' })}>{t('admin.markPaid')}</Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => updateMutation.mutate({ payment_status: 'UNPAID' })}>{t('admin.markUnpaid')}</Button>
        )}

        {canTransfer && branches.length > 0 && (
          <div className="flex items-center gap-2 ms-auto">
            <ArrowRightLeft className="size-4 text-muted-foreground" />
            <Select
              value={data.center ? String(data.center) : 'none'}
              onValueChange={(v) => {
                const next = v === 'none' ? null : Number(v)
                if (next !== data.center && confirm(t('hier.transferConfirm')))
                  updateMutation.mutate({ center: next })
              }}
            >
              <SelectTrigger size="sm" className="w-48" aria-label={t('hier.transfer')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('hier.noBranch')}</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>{b.name_en}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('admin.personalInfo')}</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t('register.firstName')} value={data.first_name} />
            <Row label={t('register.lastName')} value={data.last_name} />
            <Row label={t('register.latinFullName')} value={data.latin_full_name} />
            <Row label={t('register.gender')} value={data.gender_display || '—'} />
            <Row label={t('register.birthDate')} value={data.birth_date} />
            <Row label={t('register.birthPlace')} value={data.birth_place} />
            <Row label={t('register.address')} value={data.address} />
            <Row label={t('register.phone')} value={data.phone} />
            <Row label={t('register.educationLevel')} value={data.education_level || '—'} />
            <Row label={t('register.institution')} value={data.institution || '—'} />
            <Separator className="my-2" />
            <Row label={t('org.wilaya')} value={data.wilaya_name || '—'} />
            <Row label={t('org.club')} value={data.club_name || '—'} />
            <Row label={t('org.center')} value={data.center_name || '—'} />
            <Separator className="my-2" />
            <Row label={t('register.computedCategory')} value={data.category_display} />
            <Row label={t('register.computedAge')} value={String(data.age_at_registration)} />
            <Row label={t('common.season')} value={data.season} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {data.is_minor && (
            <Card>
              <CardHeader><CardTitle className="text-base">{t('admin.parentInfo')}</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label={t('register.parentName')} value={data.parent_name || '—'} />
                <Row label={t('register.parentIdType')} value={data.parent_id_type ? t(`register.parentIdType${data.parent_id_type}`) : '—'} />
                <Row label={t('register.parentIdNumber')} value={data.parent_id_number || '—'} />
                <Row label={t('register.parentIdIssueDate')} value={data.parent_id_issue_date || '—'} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">{t('admin.uploadedDocuments')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {data.documents.length === 0 && <p className="text-sm text-muted-foreground">{t('admin.noResults')}</p>}
              {data.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-sm">
                  <button
                    type="button"
                    onClick={() => setPreview({ id: doc.id, title: labelFor(doc), filename: doc.original_name })}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start hover:underline"
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{labelFor(doc)}</span>
                  </button>
                  <div className="flex shrink-0 items-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setPreview({ id: doc.id, title: labelFor(doc), filename: doc.original_name })}
                    >
                      <Eye className="size-4" />
                      {t('admin.viewFile')}
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => downloadDocument(doc.id, doc.original_name)}>
                      <Download className="size-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentViewer
        documentId={preview?.id ?? null}
        title={preview?.title ?? ''}
        filename={preview?.filename ?? ''}
        onClose={() => setPreview(null)}
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  )
}
