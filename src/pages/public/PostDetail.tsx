import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, CalendarDays, Lock, MapPin, MessageCircle, Pin } from 'lucide-react'
import { api } from '@/lib/api'
import type { Post, PostComment } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { LikeButton, MediaThumb, formatDate, localised } from '@/components/community/PostCard'

export default function PostDetail() {
  const { slug = '' } = useParams()
  const { t, i18n } = useTranslation()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [body, setBody] = useState('')

  const post = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => (await api.get<Post>(`/community/posts/${slug}/`)).data,
    retry: false,
  })

  const comments = useQuery({
    queryKey: ['comments', slug],
    queryFn: async () => (await api.get<PostComment[]>(`/community/posts/${slug}/comments/`)).data,
    enabled: post.isSuccess,
  })

  const like = useMutation({
    mutationFn: async () =>
      (await api.post<{ liked: boolean; like_count: number }>(
        `/community/posts/${slug}/like/`)).data,
    onSuccess: (data) => {
      queryClient.setQueryData(['post', slug], (old: Post | undefined) =>
        old ? { ...old, liked: data.liked, like_count: data.like_count } : old)
      // The feed's counts are now stale.
      queryClient.invalidateQueries({ queryKey: ['feed'] })
    },
  })

  const comment = useMutation({
    mutationFn: async () =>
      (await api.post(`/community/posts/${slug}/comments/`, {
        author_name: name, body,
      })).data,
    onSuccess: () => {
      setBody('')
      queryClient.invalidateQueries({ queryKey: ['comments', slug] })
      queryClient.invalidateQueries({ queryKey: ['post', slug] })
      queryClient.invalidateQueries({ queryKey: ['feed'] })
      toast.success(t('community.commentSent'))
    },
    onError: (error: any) => {
      const code = error?.response?.data?.code
      if (code === 'RATE_LIMITED') return toast.error(t('community.rateLimited'))
      if (code === 'COMMENTS_CLOSED') return toast.error(t('community.commentsClosed'))
      toast.error(t('community.commentFailed'))
    },
  })

  if (post.isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  if (post.isError || !post.data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <p className="text-muted-foreground">{t('community.notFound')}</p>
        <Button asChild variant="outline" className="mt-6">
          <Link to="/community">
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t('community.backToFeed')}
          </Link>
        </Button>
      </div>
    )
  }

  const data = post.data
  const title = localised(data, 'title', i18n.language)
  const text = localised(data, 'body', i18n.language)

  return (
    <article className="mx-auto max-w-3xl px-4 py-10">
      <Button asChild variant="ghost" size="sm" className="mb-4 -ms-2">
        <Link to="/community">
          <ArrowLeft className="size-4 rtl:rotate-180" />
          {t('community.backToFeed')}
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2">
        {data.pinned && (
          <Badge className="gap-1"><Pin className="size-3" />{t('community.pinned')}</Badge>
        )}
        <Badge variant="secondary">{t(`community.kind${data.kind}`)}</Badge>
        {data.club_name && <Badge variant="outline"><bdi>{data.club_name}</bdi></Badge>}
        <span className="text-sm text-muted-foreground">
          {formatDate(data.published_at, i18n.language)}
        </span>
      </div>

      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-balance">
        <bdi>{title}</bdi>
      </h1>
      {data.author_name && (
        <p className="mt-2 text-sm text-muted-foreground">
          {t('community.postedBy', { name: data.author_name })}
        </p>
      )}

      {(data.event_starts_at || data.location) && (
        <div className="mt-4 flex flex-wrap gap-4 rounded-xl bg-muted/50 px-4 py-3 text-sm">
          {data.event_starts_at && (
            <span className="flex items-center gap-1.5 font-medium text-primary">
              <CalendarDays className="size-4" />
              {t('community.eventOn', { date: formatDate(data.event_starts_at, i18n.language) })}
            </span>
          )}
          {data.location && (
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="size-4" />
              <bdi>{data.location}</bdi>
            </span>
          )}
        </div>
      )}

      {data.media.length > 0 && (
        <div className="mt-6 space-y-4">
          {data.media.map((item) => <MediaThumb key={item.id} media={item} />)}
        </div>
      )}

      {text && (
        <div className="mt-6 whitespace-pre-line text-base leading-relaxed">
          <bdi>{text}</bdi>
        </div>
      )}

      <div className="mt-8 flex items-center gap-2 border-y border-border py-3">
        <LikeButton post={data} onToggle={() => like.mutate()} pending={like.isPending} />
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground">
          <MessageCircle className="size-4" />
          {t('community.commentCount', { count: data.comment_count })}
        </span>
      </div>

      <section className="mt-8">
        <h2 className="text-xl font-bold">{t('community.comments')}</h2>

        <div className="mt-4 space-y-3">
          {comments.data?.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('community.noComments')}</p>
          )}
          {comments.data?.map((row) => (
            <Card key={row.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold"><bdi>{row.author_name}</bdi></p>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(row.created_at, i18n.language)}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                  <bdi>{row.body}</bdi>
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {data.comments_enabled ? (
          <form
            className="mt-6 space-y-3 rounded-xl border border-border p-4"
            onSubmit={(e) => { e.preventDefault(); comment.mutate() }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="comment-name">{t('community.yourName')}</Label>
              <Input
                id="comment-name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="comment-body">{t('community.yourComment')}</Label>
              <Textarea
                id="comment-body"
                value={body}
                rows={3}
                maxLength={2000}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={comment.isPending || !name.trim() || !body.trim()}>
              {t('community.sendComment')}
            </Button>
          </form>
        ) : (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
            <Lock className="size-4" />
            {t('community.commentsClosed')}
          </p>
        )}
      </section>
    </article>
  )
}
