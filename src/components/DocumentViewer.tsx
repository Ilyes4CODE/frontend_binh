import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Download, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  documentId: number | null
  title: string
  filename: string
  onClose: () => void
}

/**
 * Previews an uploaded document inside the dashboard. The file lives behind an
 * authenticated endpoint, so it is fetched as a blob with the auth header and
 * shown from an object URL rather than a plain <img src>.
 */
export function DocumentViewer({ documentId, title, filename, onClose }: Props) {
  const { t } = useTranslation()
  const [url, setUrl] = useState<string | null>(null)
  const [mime, setMime] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (documentId === null) return
    let objectUrl: string | null = null
    let cancelled = false

    setLoading(true)
    api
      .get(`/admin/documents/${documentId}/download/`, { params: { inline: 1 }, responseType: 'blob' })
      .then((response) => {
        if (cancelled) return
        const blob = response.data as Blob
        objectUrl = URL.createObjectURL(blob)
        setMime(blob.type)
        setUrl(objectUrl)
      })
      .finally(() => !cancelled && setLoading(false))

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [documentId])

  const isImage = mime.startsWith('image/')
  const isPdf = mime === 'application/pdf'

  return (
    <Dialog open={documentId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-3 pe-6">
            <span className="truncate">{title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex min-h-[24rem] items-center justify-center overflow-hidden rounded-lg bg-muted">
          {loading && <Loader2 className="size-6 animate-spin text-muted-foreground" />}
          {!loading && url && isImage && (
            <img src={url} alt={title} className="max-h-[65vh] w-auto object-contain" />
          )}
          {!loading && url && isPdf && (
            <iframe src={url} title={title} className="h-[65vh] w-full border-0" />
          )}
          {!loading && url && !isImage && !isPdf && (
            <p className="p-6 text-center text-sm text-muted-foreground">{t('admin.previewUnavailable')}</p>
          )}
        </div>

        <div className="flex justify-end">
          {url && (
            <Button asChild variant="outline">
              <a href={url} download={filename}>
                <Download className="size-4" />
                {t('admin.download')}
              </a>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
