import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Eye, EyeOff, ImagePlus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { AdminGalleryPhoto } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Carousel } from '@/components/Carousel'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

export default function AdminGallery() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [captionAr, setCaptionAr] = useState('')
  const [captionEn, setCaptionEn] = useState('')
  const [captionVi, setCaptionVi] = useState('')
  const [order, setOrder] = useState(0)
  const fileInput = useRef<HTMLInputElement>(null)

  const { data: photos = [] } = useQuery({
    queryKey: ['admin-gallery'],
    queryFn: async () => (await api.get<AdminGalleryPhoto[]>('/admin/gallery/')).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-gallery'] })
    // The public carousel reads a different endpoint.
    queryClient.invalidateQueries({ queryKey: ['gallery'] })
  }

  const upload = useMutation({
    mutationFn: async () => {
      const form = new FormData()
      form.append('image', file as File)
      form.append('caption_ar', captionAr)
      form.append('caption_en', captionEn)
      form.append('caption_vi', captionVi)
      form.append('order', String(order))
      return (await api.post('/admin/gallery/', form)).data
    },
    onSuccess: () => {
      refresh()
      setOpen(false)
      setFile(null); setCaptionAr(''); setCaptionEn(''); setCaptionVi(''); setOrder(0)
      if (fileInput.current) fileInput.current.value = ''
      toast.success(t('admin.saved'))
    },
    onError: () => toast.error(t('admin.uploadFailed')),
  })

  const patch = useMutation({
    mutationFn: async ({ id, body }: { id: number; body: Partial<AdminGalleryPhoto> }) =>
      (await api.patch(`/admin/gallery/${id}/`, body)).data,
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/gallery/${id}/`),
    onSuccess: () => { refresh(); toast.success(t('admin.saved')) },
  })

  const live = photos.filter((p) => p.active)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('admin.gallery')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.gallerySubtitle')}</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <ImagePlus className="size-4" />
          {t('admin.newPhoto')}
        </Button>
      </div>

      {live.length > 0 && (
        <Card>
          <CardContent className="p-4">
            {/* Exactly what a visitor sees, so ordering can be checked here. */}
            <Carousel photos={live} className="mx-auto max-w-2xl" />
          </CardContent>
        </Card>
      )}

      {photos.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center text-muted-foreground">
            {t('admin.noPhotos')}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => (
          <Card key={photo.id} className="overflow-hidden">
            <img
              src={photo.image_url}
              alt={photo.caption_en}
              className="aspect-16/9 w-full object-cover"
            />
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-medium">
                  <bdi>{photo.caption_en || photo.caption_ar || '—'}</bdi>
                </p>
                {!photo.active && <Badge variant="outline">{t('admin.hidden')}</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs" htmlFor={`order-${photo.id}`}>
                  {t('admin.displayOrder')}
                </Label>
                <Input
                  id={`order-${photo.id}`}
                  type="number"
                  className="h-8 w-20"
                  defaultValue={photo.order}
                  onBlur={(e) => {
                    const value = Number(e.target.value)
                    if (value !== photo.order) patch.mutate({ id: photo.id, body: { order: value } })
                  }}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="ms-auto"
                  title={photo.active ? t('admin.hide') : t('admin.show')}
                  onClick={() => patch.mutate({ id: photo.id, body: { active: !photo.active } })}
                >
                  {photo.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(t('admin.deletePhotoConfirm'))) remove.mutate(photo.id)
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('admin.newPhoto')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="gallery-file">{t('admin.photoFile')}</Label>
              <Input
                id="gallery-file"
                ref={fileInput}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.mediaHint')}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cap-ar">{t('admin.captionAr')}</Label>
              <Input id="cap-ar" dir="rtl" value={captionAr} onChange={(e) => setCaptionAr(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cap-en">{t('admin.captionEn')}</Label>
              <Input id="cap-en" value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cap-vi">{t('admin.captionVi')}</Label>
              <Input id="cap-vi" value={captionVi} onChange={(e) => setCaptionVi(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cap-order">{t('admin.displayOrder')}</Label>
              <Input
                id="cap-order"
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => upload.mutate()} disabled={!file || upload.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
