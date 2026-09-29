import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileText, ImageUp, Trash2, Undo2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { ClubLetterhead } from '@/types'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const MAX_LINES = 6
const MAX_CHARS = 120
const MAX_BYTES = 2 * 1024 * 1024
const TYPES = ['image/png', 'image/jpeg']
// What prints when a club has no logo of its own.
const PLATFORM_LOGO = '/logo.png'

interface LogoDraft {
  file: File | null
  remove: boolean
}
const UNCHANGED: LogoDraft = { file: null, remove: false }

/** A preview address for a picked file, released when it is replaced. */
function useObjectUrl(file: File | null) {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  return url
}

function tidy(lines: string): string[] {
  return lines.split('\n').map((line) => line.trim()).filter(Boolean)
}

/**
 * Edits what heads a club's printed documents: its logos and header lines.
 *
 * Changes are staged and saved together. The preview beside them is drawn the
 * way the PDF is — right to left whatever the dashboard's language, since the
 * letterhead is Arabic — and "Preview PDF" shows the real thing once saved.
 */
export function ClubLetterheadEditor({ clubId }: { clubId: number }) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['letterhead', clubId],
    queryFn: async () => (await api.get<ClubLetterhead>(`/admin/clubs/${clubId}/letterhead/`)).data,
  })

  const [lines, setLines] = useState('')
  const [logo, setLogo] = useState<LogoDraft>(UNCHANGED)
  const [secondary, setSecondary] = useState<LogoDraft>(UNCHANGED)

  useEffect(() => {
    if (!data) return
    setLines(data.letterhead_lines ?? '')
    setLogo(UNCHANGED)
    setSecondary(UNCHANGED)
  }, [data])

  const logoPicked = useObjectUrl(logo.file)
  const secondaryPicked = useObjectUrl(secondary.file)

  // What each side will show once saved.
  const logoSrc = logo.file ? logoPicked : logo.remove ? null : data?.logo_url ?? null
  const secondarySrc = secondary.file ? secondaryPicked : secondary.remove ? null : data?.logo_secondary_url ?? null
  const shownStart = logoSrc ?? PLATFORM_LOGO
  const shownEnd = secondarySrc ?? shownStart

  const typed = tidy(lines)
  const usingDefault = typed.length === 0
  const previewLines = usingDefault ? data?.default_lines ?? [] : typed
  const problem =
    typed.length > MAX_LINES ? t('letterhead.tooManyLines')
      : typed.some((line) => line.length > MAX_CHARS) ? t('letterhead.lineTooLong')
        : null

  const dirty = Boolean(data) && (
    typed.join('\n') !== tidy(data?.letterhead_lines ?? '').join('\n')
    || Boolean(logo.file) || logo.remove || Boolean(secondary.file) || secondary.remove
  )

  const save = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.append('letterhead_lines', typed.join('\n'))
      if (logo.file) form.append('logo', logo.file)
      else if (logo.remove) form.append('remove_logo', 'true')
      if (secondary.file) form.append('logo_secondary', secondary.file)
      else if (secondary.remove) form.append('remove_logo_secondary', 'true')
      return (await api.patch<ClubLetterhead>(`/admin/clubs/${clubId}/letterhead/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })).data
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['letterhead', clubId], saved)
      toast.success(t('admin.saved'))
    },
    onError: (err: any) => {
      const body = err?.response?.data
      const message = body && typeof body === 'object' ? Object.values(body).flat().join(' ') : ''
      toast.error(message || t('register.genericError'))
    },
  })

  async function previewPdf() {
    // Opened now, filled in after the download: a window opened after an
    // await is taken for a popup and blocked.
    const tab = window.open('', '_blank')
    try {
      const response = await api.get(`/admin/clubs/${clubId}/letterhead/preview/`, { responseType: 'blob' })
      const url = URL.createObjectURL(response.data as Blob)
      if (tab) tab.location.href = url
      else window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch {
      tab?.close()
      toast.error(t('register.genericError'))
    }
  }

  return (
    <div className="space-y-5">
      {/* Preview — right to left whatever the dashboard's language. */}
      <div className="space-y-1.5">
        <Label>{t('letterhead.preview')}</Label>
        <div dir="rtl" className="rounded-lg border border-border bg-white p-4 text-neutral-900 shadow-sm">
          <div className="flex items-center gap-3">
            <img src={shownStart} alt="" className="size-14 shrink-0 object-contain sm:size-16" />
            <div className="min-w-0 flex-1 text-center leading-snug">
              {previewLines.map((line, index) => {
                const heavy = index === 0 || index === previewLines.length - 1
                return (
                  <p key={index} className={cn('truncate', heavy ? 'text-[13px] font-bold' : 'text-xs')}>
                    {line}
                  </p>
                )
              })}
            </div>
            <img src={shownEnd} alt="" className="size-14 shrink-0 object-contain sm:size-16" />
          </div>
          <div className="mt-3 h-0.5 bg-primary" />
          {usingDefault && (
            <p className="mt-2 text-center text-[11px] text-neutral-500">{t('letterhead.officialWording')}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LogoSlot
          label={t('letterhead.logo')}
          hint={t('letterhead.logoHint')}
          src={logoSrc}
          fallbackLabel={t('letterhead.platformLogo')}
          fallbackSrc={PLATFORM_LOGO}
          draft={logo}
          hasSaved={Boolean(data?.logo_url)}
          onChange={setLogo}
        />
        <LogoSlot
          label={t('letterhead.logoSecondary')}
          hint={t('letterhead.logoSecondaryHint')}
          src={secondarySrc}
          fallbackLabel={t('letterhead.sameAsFirst')}
          fallbackSrc={shownStart}
          draft={secondary}
          hasSaved={Boolean(data?.logo_secondary_url)}
          onChange={setSecondary}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t('letterhead.fileRules')}</p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={`letterhead-${clubId}`}>{t('letterhead.lines')}</Label>
          <span className={cn('text-xs', typed.length > MAX_LINES ? 'text-destructive' : 'text-muted-foreground')}>
            {t('letterhead.lineCount', { count: typed.length })}
          </span>
        </div>
        <Textarea
          id={`letterhead-${clubId}`}
          dir="rtl"
          rows={6}
          value={lines}
          placeholder={(data?.default_lines ?? []).join('\n')}
          onChange={(event) => setLines(event.target.value)}
        />
        <p className="text-xs text-muted-foreground">{t('letterhead.linesHint')}</p>
        {problem && <p className="text-xs text-destructive">{problem}</p>}
        <div className="flex flex-wrap gap-1">
          <Button type="button" size="sm" variant="ghost"
            onClick={() => setLines((data?.default_lines ?? []).join('\n'))}>
            {t('letterhead.startFromDefault')}
          </Button>
          {!usingDefault && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setLines('')}>
              {t('letterhead.useDefault')}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <Button type="button" variant="outline" size="sm" disabled={dirty} onClick={previewPdf}>
          <FileText className="size-4" />
          {t('letterhead.previewPdf')}
        </Button>
        <div className="flex items-center gap-2">
          {dirty && <span className="text-xs text-muted-foreground">{t('letterhead.unsaved')}</span>}
          <Button type="button" size="sm" disabled={!dirty || Boolean(problem) || save.isPending}
            onClick={() => save.mutate()}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function LogoSlot({
  label, hint, src, fallbackLabel, fallbackSrc, draft, hasSaved, onChange,
}: {
  label: string
  hint: string
  /** The logo this side will have once saved, or null for the fallback. */
  src: string | null
  fallbackLabel: string
  fallbackSrc: string
  draft: LogoDraft
  hasSaved: boolean
  onChange: (draft: LogoDraft) => void
}) {
  const { t } = useTranslation()
  const input = useRef<HTMLInputElement>(null)

  function pick(file: File | undefined) {
    if (!file) return
    if (!TYPES.includes(file.type)) {
      toast.error(t('letterhead.fileType'))
      return
    }
    if (file.size > MAX_BYTES) {
      toast.error(t('letterhead.fileTooBig'))
      return
    }
    onChange({ file, remove: false })
  }

  const changed = Boolean(draft.file) || draft.remove

  return (
    <div className="space-y-2 rounded-lg border border-border p-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center rounded-md border border-dashed border-border bg-muted/40">
          <img src={src ?? fallbackSrc} alt="" className={cn('size-14 object-contain', !src && 'opacity-40')} />
        </div>
        <div className="min-w-0 space-y-1">
          {!src && <p className="text-xs text-muted-foreground">{fallbackLabel}</p>}
          <div className="flex flex-wrap gap-1">
            <Button type="button" size="sm" variant="outline" onClick={() => input.current?.click()}>
              <ImageUp className="size-4" />
              {src ? t('letterhead.change') : t('letterhead.choose')}
            </Button>
            {src && (hasSaved || draft.file) && (
              <Button type="button" size="sm" variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onChange({ file: null, remove: hasSaved })}>
                <Trash2 className="size-4" />
                {t('letterhead.remove')}
              </Button>
            )}
            {changed && (
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(UNCHANGED)}>
                <Undo2 className="size-4" />
                {t('letterhead.undo')}
              </Button>
            )}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={(event) => {
          pick(event.target.files?.[0])
          // Picking the same file again after an undo must still fire.
          event.target.value = ''
        }}
      />
    </div>
  )
}
