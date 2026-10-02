import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowRightLeft, Check, Download, Eye, FileText, IdCard, Mail, MailWarning, MailX, Printer, RotateCcw, Trash2, X,
} from 'lucide-react'
import { api, apiUrl } from '@/lib/api'
import { isolate } from '@/lib/utils'
import { DocumentViewer } from '@/components/DocumentViewer'
import type { Center, DecisionEmailStatus, DecisionResult, Registration, RejectionReason } from '@/types'
import { useAuth } from '@/context/AuthContext'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useConfirm } from '@/components/ConfirmDialog'
import { RejectDialog } from '@/components/RejectDialog'
import { Separator } from '@/components/ui/separator'

export default function AdminRegistrationDetail() {
  const { id } = useParams<{ id: string }>()
  const { t, i18n } = useTranslation()
  const confirm = useConfirm()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
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

  const deleteMutation = useMutation({
    mutationFn: async () => api.delete(`/admin/registrations/${id}/`),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['admin-registration', id] })
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      toast.success(t('admin.registrationDeleted'))
      navigate('/admin/registrations', { replace: true })
    },
    onError: () => toast.error(t('register.genericError')),
  })

  const [rejectOpen, setRejectOpen] = useState(false)

  type Decision =
    | { action: 'approve' }
    | { action: 'reject'; reason: RejectionReason; note: string }
    | { action: 'resend-email' }

  /** Tell the admin what happened to the email — the decision itself is saved
   *  either way, and a failed send can be retried from the toast. */
  function reportEmail(result: DecisionEmailStatus, action: Decision['action'], email: string) {
    const done = action === 'approve' ? t('decision.approvedDone')
      : action === 'reject' ? t('decision.rejectedDone') : ''
    if (result === 'SENT') {
      toast.success([done, t('decision.emailSentTo', { email: isolate(email) })].filter(Boolean).join(' '))
    } else if (result === 'NO_EMAIL') {
      toast.warning([done, t('decision.noEmailSent')].filter(Boolean).join(' '))
    } else {
      toast.error([done, t('decision.emailFailed')].filter(Boolean).join(' '), {
        duration: 12000,
        action: { label: t('decision.resend'), onClick: () => decide.mutate({ action: 'resend-email' }) },
      })
    }
  }

  const decide = useMutation({
    mutationFn: async (decision: Decision) => {
      const body = decision.action === 'reject' ? { reason: decision.reason, note: decision.note } : {}
      return (await api.post<DecisionResult>(`/admin/registrations/${id}/${decision.action}/`, body)).data
    },
    onSuccess: (updated, decision) => {
      const { email_result, ...registration } = updated
      queryClient.setQueryData(['admin-registration', id], registration)
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] })
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      setRejectOpen(false)
      reportEmail(email_result, decision.action, registration.email ?? '')
    },
    onError: (err: any) => {
      const body = err?.response?.data
      const message = body && typeof body === 'object' ? Object.values(body).flat().join(' ') : ''
      toast.error(message || t('register.genericError'))
    },
  })

  async function approve() {
    if (!data) return
    const name = `${data.first_name} ${data.last_name}`.trim()
    const ok = await confirm({
      variant: 'approve',
      title: t('decision.approveTitle'),
      description: data.email
        ? t('decision.approveWithEmail', { name, email: isolate(data.email) })
        : t('decision.approveNoEmail', { name }),
      confirmLabel: data.email ? t('decision.approveAndSend') : t('decision.approve'),
    })
    if (ok) decide.mutate({ action: 'approve' })
  }

  async function reopen() {
    const ok = await confirm({
      variant: 'warning',
      title: t('decision.reopenTitle'),
      description: t('decision.reopenBody'),
      confirmLabel: t('decision.reopen'),
    })
    if (ok) updateMutation.mutate({ status: 'PENDING' })
  }

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

  /**
   * Sends the registration form straight to the printer.
   *
   * It used to open the PDF's URL in a new tab and call print() on that tab.
   * The API is on another domain, so the browser refuses to let this page
   * touch that window, and the server marks the PDF as a download anyway —
   * the button could not have worked in production. Fetched as a blob, the PDF
   * is on this page's own origin, and a hidden frame can print it.
   */
  async function printRegistrationForm() {
    if (!data) return
    try {
      const response = await api.get(`/registrations/${data.reference}/pdf/`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data as Blob)
      const frame = document.createElement('iframe')
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
      frame.src = url
      frame.onload = () => {
        try {
          frame.contentWindow?.focus()
          frame.contentWindow?.print()
        } catch {
          // Browsers that will not print a PDF from a frame get it in a tab.
          window.open(url, '_blank')
        }
      }
      document.body.appendChild(frame)
      // The print dialog has read the document long before this.
      setTimeout(() => { frame.remove(); URL.revokeObjectURL(url) }, 60_000)
    } catch {
      toast.error(t('register.genericError'))
    }
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
            <a href={apiUrl(`/registrations/${data.reference}/pdf/`)} download>
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
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={deleteMutation.isPending}
            onClick={async () => {
              const name = `${data.first_name} ${data.last_name}`.trim()
              if (await confirm({ variant: 'delete', description: t('admin.deleteRegistrationConfirm', { name, reference: data.reference }) })) {
                deleteMutation.mutate()
              }
            }}
          >
            <Trash2 className="size-4" />
            {t('admin.deleteRegistration')}
          </Button>
        </div>
      </div>

      <DecisionPanel
        registration={data}
        busy={decide.isPending || updateMutation.isPending}
        onApprove={approve}
        onReject={() => setRejectOpen(true)}
        onReopen={reopen}
        onResend={() => decide.mutate({ action: 'resend-email' })}
      />
      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        candidateName={`${data.first_name} ${data.last_name}`.trim()}
        email={data.email ?? ''}
        pending={decide.isPending}
        onConfirm={(reason, note) => decide.mutate({ action: 'reject', reason, note })}
      />

      <div className="flex flex-wrap gap-2">
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
              onValueChange={async (v) => {
                const next = v === 'none' ? null : Number(v)
                if (next !== data.center && (await confirm({ variant: 'warning', description: t('hier.transferConfirm') })))
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
            <Row label={t('register.email')} value={data.email || '—'} />
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
      {/* bdi: a phone number or an email keeps its own direction instead of
          being reordered by the Arabic around it ("56 34 12 0555"). */}
      <span className="text-end font-medium"><bdi>{value}</bdi></span>
    </div>
  )
}


/**
 * Where a registration is decided. Pending: two clear buttons. Decided: what
 * was decided, why if it was a refusal, and whether the candidate was told —
 * with a way to tell them again if the email did not go.
 */
function DecisionPanel({
  registration, busy, onApprove, onReject, onReopen, onResend,
}: {
  registration: Registration
  busy: boolean
  onApprove: () => void
  onReject: () => void
  onReopen: () => void
  onResend: () => void
}) {
  const { t, i18n } = useTranslation()
  const { status } = registration

  if (status === 'PENDING') {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{t('decision.pendingTitle')}</p>
            <p className="text-sm text-muted-foreground">{t('decision.pendingHint')}</p>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700 sm:flex-none"
              disabled={busy} onClick={onApprove}>
              <Check className="size-4" />
              {t('decision.approve')}
            </Button>
            <Button className="flex-1 bg-destructive text-white hover:bg-destructive/90 sm:flex-none"
              disabled={busy} onClick={onReject}>
              <X className="size-4" />
              {t('decision.reject')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const approved = status === 'APPROVED'
  const emailStatus = registration.decision_email_status
  const when = registration.decision_email_at
    ? new Date(registration.decision_email_at).toLocaleString(i18n.language)
    : ''

  return (
    <Card className={approved ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className={`flex items-center gap-2 font-semibold ${approved ? 'text-emerald-700' : 'text-destructive'}`}>
            {approved ? <Check className="size-5" /> : <X className="size-5" />}
            {approved ? t('decision.isApproved') : t('decision.isRejected')}
          </p>
          <div className="flex flex-wrap gap-2">
            {approved ? (
              <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
                <X className="size-4" />{t('decision.reject')}
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled={busy} onClick={onApprove}>
                <Check className="size-4" />{t('decision.approve')}
              </Button>
            )}
            <Button size="sm" variant="ghost" disabled={busy} onClick={onReopen}>
              <RotateCcw className="size-4" />{t('decision.reopen')}
            </Button>
          </div>
        </div>

        {!approved && (registration.rejection_reason || registration.rejection_note) && (
          <div className="rounded-md border-s-4 border-destructive bg-background p-3 text-sm">
            {registration.rejection_reason && registration.rejection_reason !== 'OTHER' && (
              <p className="font-medium">{t(`decision.reasons.${registration.rejection_reason}`)}</p>
            )}
            {registration.rejection_note && (
              <p className="mt-1 whitespace-pre-line text-muted-foreground">{registration.rejection_note}</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {emailStatus === 'SENT' && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Mail className="size-4" />
              {t('decision.emailWasSent', { email: isolate(registration.email), when: isolate(when) })}
            </span>
          )}
          {emailStatus === 'NO_EMAIL' && (
            <span className="flex items-center gap-1.5 text-amber-700">
              <MailX className="size-4" />{t('decision.noEmailOnFile')}
            </span>
          )}
          {emailStatus === 'FAILED' && (
            <span className="flex items-center gap-1.5 text-destructive">
              <MailWarning className="size-4" />{t('decision.emailFailedOn', { when: isolate(when) })}
            </span>
          )}
          {(emailStatus === 'SENT' || emailStatus === 'FAILED') && (
            <Button size="sm" variant={emailStatus === 'FAILED' ? 'default' : 'ghost'} disabled={busy} onClick={onResend}>
              <Mail className="size-4" />{t('decision.resend')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
