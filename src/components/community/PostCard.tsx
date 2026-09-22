import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CalendarDays, Heart, MapPin, MessageCircle, Pin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Post, PostMedia } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

/** Picks the field written in the reader's language, falling back to whichever
 *  the author actually filled in — a post written only in Arabic must still
 *  render something on the English page rather than a blank card. */
export function localised(
  post: Post,
  field: 'title' | 'body',
  language: string,
): string {
  const order = [language, 'ar', 'en', 'vi'].filter(
    (l, i, all) => ['ar', 'en', 'vi'].includes(l) && all.indexOf(l) === i,
  )
  for (const lang of order) {
    const value = post[`${field}_${lang}` as keyof Post]
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export function formatDate(value: string | null, language: string): string {
  if (!value) return ''
  const locale = { ar: 'ar-DZ', vi: 'vi-VN', en: 'en-GB' }[language] ?? 'en-GB'
  try {
    return new Date(value).toLocaleDateString(locale, {
      day: 'numeric', month: 'long', year: 'numeric',
    })
  } catch {
    return value.slice(0, 10)
  }
}

export function MediaThumb({ media, className }: { media: PostMedia; className?: string }) {
  const { t } = useTranslation()
  if (media.kind === 'VIDEO') {
    return (
      <video
        src={media.url}
        poster={media.poster_url || undefined}
        controls
        preload="metadata"
        aria-label={media.alt_text || t('community.watchVideo')}
        className={cn('w-full rounded-xl bg-black', className)}
      />
    )
  }
  return (
    <img
      src={media.url}
      alt={media.alt_text}
      loading="lazy"
      className={cn('w-full rounded-xl object-cover', className)}
    />
  )
}

interface PostCardProps {
  post: Post
  onToggleLike: (post: Post) => void
  pending?: boolean
}

export function PostCard({ post, onToggleLike, pending }: PostCardProps) {
  const { t, i18n } = useTranslation()
  const title = localised(post, 'title', i18n.language)
  const body = localised(post, 'body', i18n.language)
  const cover = post.media[0]

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-md">
      {cover && (
        <Link to={`/community/${post.slug}`} className="block shrink-0">
          <MediaThumb media={cover} className="aspect-16/9 rounded-none" />
        </Link>
      )}
      <CardContent className="flex flex-1 flex-col space-y-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          {post.pinned && (
            <Badge className="gap-1">
              <Pin className="size-3" />
              {t('community.pinned')}
            </Badge>
          )}
          <Badge variant="secondary">{t(`community.kind${post.kind}`)}</Badge>
          {post.club_name && <Badge variant="outline"><bdi>{post.club_name}</bdi></Badge>}
          <span className="text-xs text-muted-foreground">
            {formatDate(post.published_at, i18n.language)}
          </span>
        </div>

        <Link to={`/community/${post.slug}`} className="block group/title">
          <h3 className="text-lg font-bold leading-snug group-hover/title:text-primary">
            <bdi>{title}</bdi>
          </h3>
        </Link>

        {post.kind === 'EVENT' && post.event_starts_at && (
          <p className="flex items-center gap-1.5 text-sm font-medium text-primary">
            <CalendarDays className="size-4" />
            {t('community.eventOn', { date: formatDate(post.event_starts_at, i18n.language) })}
          </p>
        )}
        {post.location && (
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-4" />
            <bdi>{post.location}</bdi>
          </p>
        )}

        {body && (
          <p className="line-clamp-3 text-sm text-muted-foreground leading-relaxed">
            <bdi>{body}</bdi>
          </p>
        )}

        <div className="mt-auto flex items-center gap-1 pt-1">
          <LikeButton post={post} onToggle={onToggleLike} pending={pending} />
          <Link
            to={`/community/${post.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <MessageCircle className="size-4" />
            {t('community.commentCount', { count: post.comment_count })}
          </Link>
          <Link
            to={`/community/${post.slug}`}
            className="ms-auto text-sm font-semibold text-primary hover:underline"
          >
            {t('common.readMore')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

export function LikeButton({ post, onToggle, pending }: {
  post: Post
  onToggle: (post: Post) => void
  pending?: boolean
}) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={() => onToggle(post)}
      disabled={pending}
      aria-pressed={post.liked}
      aria-label={post.liked ? t('community.liked') : t('community.like')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-colors',
        'disabled:opacity-60',
        post.liked
          ? 'font-semibold text-primary hover:bg-primary/10'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Heart
        className={cn(
          'size-4 transition-transform duration-200',
          post.liked && 'scale-110 fill-current',
        )}
      />
      {t('community.likeCount', { count: post.like_count })}
    </button>
  )
}
