import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, MailX } from 'lucide-react'
import { cn, isolate } from '@/lib/utils'
import type { RejectionReason } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ConfirmIllustration } from '@/components/ConfirmDialog'

export const REJECTION_REASONS: RejectionReason[] = [
  'INCOMPLETE', 'UNREADABLE', 'MISMATCH', 'NO_PLACE', 'DUPLICATE', 'OTHER',
]

/**
 * Refusing a registration: pick a reason, add a note in your own words, or
 * both — "Other" needs the note, since it says nothing by itself. Whatever is
 * chosen here is what the candidate reads in their email.
 */
export function RejectDialog({
  open, onOpenChange, candidateName, email, pending, onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  candidateName: string
  email: string
  pending: boolean
  onConfirm: (reason: RejectionReason, note: string) => void
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState<RejectionReason | null>(null)
  const [note, setNote] = useState('')

  // A fresh start each time it opens.
  useEffect(() => {
    if (open) {
      setReason(null)
      setNote('')
    }
  }, [open])

  const noteRequired = reason === 'OTHER'
  const ready = reason !== null && (!noteRequired || note.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!pending) onOpenChange(next) }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <ConfirmIllustration variant="reject" className="size-28" />
        <DialogHeader className="items-center text-center sm:text-center">
          <DialogTitle className="text-lg">{t('decision.rejectTitle')}</DialogTitle>
          <DialogDescription className="text-center">
            {t('decision.rejectIntro', { name: candidateName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{t('decision.reason')}</Label>
          <div className="grid gap-2" role="radiogroup">
            {REJECTION_REASONS.map((code) => (
              <button
                key={code}
                type="button"
                role="radio"
                aria-checked={reason === code}
                onClick={() => setReason(code)}
                className={cn(
                  'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-start text-sm transition-colors',
                  reason === code
                    ? 'border-destructive bg-destructive/5 font-medium text-destructive'
                    : 'border-border hover:bg-muted',
                )}
              >
                <span className={cn(
                  'grid size-4 shrink-0 place-items-center rounded-full border',
                  reason === code ? 'border-destructive' : 'border-muted-foreground/40',
                )}>
                  {reason === code && <span className="size-2 rounded-full bg-destructive" />}
                </span>
                {t(`decision.reasons.${code}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reject-note">
            {noteRequired ? t('decision.noteRequired') : t('decision.noteOptional')}
          </Label>
          <Textarea
            id="reject-note"
            rows={3}
            maxLength={1000}
            value={note}
            placeholder={t('decision.notePlaceholder')}
            onChange={(event) => setNote(event.target.value)}
          />
        </div>

        <p className={cn(
          'flex items-start gap-2 rounded-md p-2.5 text-xs',
          email ? 'bg-muted text-muted-foreground' : 'bg-amber-50 text-amber-900',
        )}>
          {email ? <Mail className="mt-0.5 size-3.5 shrink-0" /> : <MailX className="mt-0.5 size-3.5 shrink-0" />}
          {email ? t('decision.rejectEmailNotice', { email: isolate(email) }) : t('decision.noEmailNotice')}
        </p>

        <DialogFooter className="gap-2">
          <Button variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            disabled={!ready || pending}
            onClick={() => reason && onConfirm(reason, note.trim())}
          >
            {email ? t('decision.rejectAndSend') : t('decision.reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
