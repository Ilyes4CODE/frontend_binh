import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Eye, EyeOff, Globe, Paperclip, Pencil, Pin, Plus, Send, Trash2, Undo2,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/context/AuthContext'
import type { AdminPost, AdminPostComment, Club, Paginated, PostKind } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

const PLATFORM = '__platform__'
const KINDS: PostKind[] = ['NEWS', 'EVENT', 'RESULT']

interface Draft {
  club: string
  kind: PostKind
  title_ar: string
  title_en: string
  title_vi: string
  body_ar: string
  body_en: string
  body_vi: string
  event_starts_at: string
  location: string
  pinned: boolean
  comments_enabled: boolean
}

const EMPTY: Draft = {
  club: PLATFORM, kind: 'NEWS',
  title_ar: '', title_en: '', title_vi: '',
  body_ar: '', body_en: '', body_vi: '',
  event_starts_at: '', location: '', pinned: false, comments_enabled: true,
}

/** `datetime-local` wants `YYYY-MM-DDTHH:mm`; the API returns full ISO. */
const toLocalInput = (iso: string | null) => (iso ? iso.slice(0, 16) : '')

export default function AdminCommunity() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const isSuperAdmin = user?.is_super_admin ?? false

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<AdminPost | null>(null)
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  const posts = useQuery({
    queryKey: ['admin-posts'],
    queryFn: async () => (await api.get<Paginated<AdminPost>>('/admin/posts/')).data,
  })
  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => (await api.get<Club[]>('/admin/clubs/')).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
    queryClient.invalidateQueries({ queryKey: ['admin-comments'] })
  }

  useEffect(() => {
    if (!open) return
    setError(null)
    setDraft(editing ? {
      club: editing.club ? String(editing.club) : PLATFORM,
      kind: editing.kind,
      title_ar: editing.title_ar, title_en: editing.title_en, title_vi: editing.title_vi,
      body_ar: editing.body_ar, body_en: editing.body_en, body_vi: editing.body_vi,
      event_starts_at: toLocalInput(editing.event_starts_at),
      location: editing.location,
      pinned: editing.pinned,
      comments_enabled: editing.comments_enabled,
    } : { ...EMPTY, club: user?.club ? String(user.club) : PLATFORM })
  }, [open, editing, user])

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...draft,
        club: draft.club === PLATFORM ? null : Number(draft.club),
        event_starts_at: draft.event_starts_at || null,
      }
      if (editing) return (await api.patch(`/admin/posts/${editing.id}/`, payload)).data
      return (await api.post('/admin/posts/', payload)).data
    },
    onSuccess: () => { refresh(); setOpen(false); setEditing(null); toast.success(t('admin.saved')) },
    onError: (err: any) => {
      const data = err?.response?.data
      setError(typeof data === 'object' && data
        ? Object.entries(data).map(([k, v]) => `${k}: ${[v].flat().join(' ')}`).join(' · ')
        : t('register.genericError'))
    },
  })

  const act = useMutation({
    mutationFn: async ({ id, verb }: { id: number; verb: 'publish' | 'unpublish' }) =>
      (await api.post(`/admin/posts/${id}/${verb}/`)).data,
    onSuccess: () => { refresh(); toast.success(t('admin.saved')) },
  })

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/posts/${id}/`),
    onSuccess: () => { refresh(); toast.success(t('admin.saved')) },
  })

  const rows = posts.data?.results ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">{t('admin.posts')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.postsSubtitle')}</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true) }}>
          <Plus className="size-4" />
          {t('admin.newPost')}
        </Button>
      </div>

      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">{t('admin.posts')}</TabsTrigger>
          <TabsTrigger value="comments">{t('admin.moderation')}</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-4 pt-4">
          {rows.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center text-muted-foreground">
                {t('admin.noPosts')}
              </CardContent>
            </Card>
          )}
          {rows.map((post) => (
            <PostRow
              key={post.id}
              post={post}
              onEdit={() => { setEditing(post); setOpen(true) }}
              onDelete={() => { if (confirm(t('admin.deletePostConfirm'))) remove.mutate(post.id) }}
              onPublish={() => act.mutate({ id: post.id, verb: 'publish' })}
              onUnpublish={() => act.mutate({ id: post.id, verb: 'unpublish' })}
              onChanged={refresh}
            />
          ))}
        </TabsContent>

        <TabsContent value="comments" className="pt-4">
          <Moderation />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? t('admin.editPost') : t('admin.newPost')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('admin.postKind')}</Label>
                <Select
                  value={draft.kind}
                  onValueChange={(v) => setDraft({ ...draft, kind: v as PostKind })}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>{t(`community.kind${k}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isSuperAdmin && (
                <div className="space-y-1.5">
                  <Label>{t('org.club')}</Label>
                  <Select value={draft.club} onValueChange={(v) => setDraft({ ...draft, club: v })}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={PLATFORM}>{t('common.clubName')}</SelectItem>
                      {clubs.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.name_en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Field label={t('admin.titleAr')} dir="rtl"
              value={draft.title_ar} onChange={(v) => setDraft({ ...draft, title_ar: v })} />
            <Field label={t('admin.titleEn')}
              value={draft.title_en} onChange={(v) => setDraft({ ...draft, title_en: v })} />
            <Field label={t('admin.titleVi')}
              value={draft.title_vi} onChange={(v) => setDraft({ ...draft, title_vi: v })} />

            <Field label={t('admin.bodyAr')} dir="rtl" area
              value={draft.body_ar} onChange={(v) => setDraft({ ...draft, body_ar: v })} />
            <Field label={t('admin.bodyEn')} area
              value={draft.body_en} onChange={(v) => setDraft({ ...draft, body_en: v })} />
            <Field label={t('admin.bodyVi')} area
              value={draft.body_vi} onChange={(v) => setDraft({ ...draft, body_vi: v })} />

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>{t('admin.eventStart')}</Label>
                <Input
                  type="datetime-local"
                  value={draft.event_starts_at}
                  onChange={(e) => setDraft({ ...draft, event_starts_at: e.target.value })}
                />
              </div>
              <Field label={t('admin.location')}
                value={draft.location} onChange={(v) => setDraft({ ...draft, location: v })} />
            </div>

            <div className="flex flex-wrap gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={draft.pinned}
                  onCheckedChange={(v) => setDraft({ ...draft, pinned: v })}
                />
                {t('admin.pinned')}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={draft.comments_enabled}
                  onCheckedChange={(v) => setDraft({ ...draft, comments_enabled: v })}
                />
                {t('admin.allowComments')}
              </label>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, value, onChange, dir, area }: {
  label: string
  value: string
  onChange: (value: string) => void
  dir?: 'rtl'
  area?: boolean
}) {
  const Control = area ? Textarea : Input
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Control dir={dir} value={value} onChange={(e: any) => onChange(e.target.value)} />
    </div>
  )
}

function statusTone(post: AdminPost): { label: string; variant: 'default' | 'secondary' | 'outline' } {
  if (post.status !== 'PUBLISHED') return { label: `statusHint:${post.status}`, variant: 'outline' }
  // Published but dated ahead: it is queued, not live.
  return post.is_live
    ? { label: 'live', variant: 'default' }
    : { label: 'scheduled', variant: 'secondary' }
}

function PostRow({ post, onEdit, onDelete, onPublish, onUnpublish, onChanged }: {
  post: AdminPost
  onEdit: () => void
  onDelete: () => void
  onPublish: () => void
  onUnpublish: () => void
  onChanged: () => void
}) {
  const { t } = useTranslation()
  const fileInput = useRef<HTMLInputElement>(null)
  const tone = statusTone(post)

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      return (await api.post(`/admin/posts/${post.id}/media/`, form)).data
    },
    onSuccess: () => { onChanged(); toast.success(t('admin.saved')) },
    onError: () => toast.error(t('admin.uploadFailed')),
  })

  const dropMedia = useMutation({
    mutationFn: async (mediaId: number) => api.delete(`/admin/posts/${post.id}/media/${mediaId}/`),
    onSuccess: onChanged,
  })

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge variant={tone.variant}>
                {tone.label.startsWith('statusHint:')
                  ? t(`admin.status${post.status}`)
                  : t(`admin.${tone.label}`)}
              </Badge>
              <Badge variant="secondary">{t(`community.kind${post.kind}`)}</Badge>
              {post.pinned && (
                <Badge className="gap-1"><Pin className="size-3" />{t('admin.pinned')}</Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Globe className="size-3" />
                <bdi>{post.club_name || t('common.clubName')}</bdi>
              </Badge>
            </div>
            <p className="truncate font-semibold">
              <bdi>{post.title_ar || post.title_en || post.title_vi}</bdi>
            </p>
            <p className="text-xs text-muted-foreground">
              {t('community.likeCount', { count: post.like_count })}
              {' · '}
              {t('community.commentCount', { count: post.comment_count })}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {post.status === 'PUBLISHED' ? (
              <Button size="sm" variant="outline" onClick={onUnpublish}>
                <Undo2 className="size-4" />
                {t('admin.unpublish')}
              </Button>
            ) : (
              <Button size="sm" onClick={onPublish}>
                <Send className="size-4" />
                {t('admin.publish')}
              </Button>
            )}
            <Button size="icon" variant="ghost" onClick={onEdit}><Pencil className="size-4" /></Button>
            <Button size="icon" variant="ghost" onClick={onDelete}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('admin.attachments')}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {post.media.map((item) => (
              <div key={item.id} className="group/media relative">
                {item.kind === 'VIDEO' ? (
                  <video src={item.url} className="size-20 rounded-lg bg-black object-cover" />
                ) : (
                  <img src={item.url} alt={item.alt_text} className="size-20 rounded-lg object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => dropMedia.mutate(item.id)}
                  aria-label={t('common.delete')}
                  className="absolute -end-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-destructive text-white opacity-0 transition-opacity group-hover/media:opacity-100 focus-visible:opacity-100"
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            ))}
            <input
              ref={fileInput}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) upload.mutate(file)
                e.target.value = ''
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInput.current?.click()}
              disabled={upload.isPending}
            >
              <Paperclip className="size-4" />
              {t('admin.addMedia')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('admin.mediaHint')}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Moderation() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const comments = useQuery({
    queryKey: ['admin-comments'],
    queryFn: async () => (await api.get<Paginated<AdminPostComment>>('/admin/comments/')).data,
  })

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-comments'] })
    queryClient.invalidateQueries({ queryKey: ['admin-posts'] })
  }

  const toggle = useMutation({
    mutationFn: async ({ id, verb }: { id: number; verb: 'hide' | 'show' }) =>
      (await api.post(`/admin/comments/${id}/${verb}/`)).data,
    onSuccess: refresh,
  })

  const remove = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/comments/${id}/`),
    onSuccess: () => { refresh(); toast.success(t('admin.saved')) },
  })

  const rows = comments.data?.results ?? []

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-muted-foreground">
          {t('admin.noComments')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold"><bdi>{row.author_name}</bdi></p>
                  {row.status === 'HIDDEN' && (
                    <Badge variant="outline">{t('admin.hidden')}</Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    {t('admin.onPost')} <bdi>{row.post_title}</bdi>
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                  <bdi>{row.body}</bdi>
                </p>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {t('admin.ipAddress')}: {row.ip_address || '—'}
                  {' · '}
                  {new Date(row.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  title={row.status === 'HIDDEN' ? t('admin.show') : t('admin.hide')}
                  onClick={() => toggle.mutate({
                    id: row.id, verb: row.status === 'HIDDEN' ? 'show' : 'hide',
                  })}
                >
                  {row.status === 'HIDDEN' ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(t('admin.deleteCommentConfirm'))) remove.mutate(row.id)
                  }}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
