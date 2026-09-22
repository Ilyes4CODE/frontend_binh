import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessagesSquare } from 'lucide-react'
import { api } from '@/lib/api'
import type { Feed, Post, PostKind } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Illustration } from '@/components/Illustration'
import { Reveal } from '@/components/Reveal'
import { PostCard } from '@/components/community/PostCard'

const KINDS: (PostKind | 'ALL')[] = ['ALL', 'NEWS', 'EVENT', 'RESULT']
const PAGE_SIZE = 8

export default function Community() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [kind, setKind] = useState<PostKind | 'ALL'>('ALL')

  const feed = useInfiniteQuery({
    queryKey: ['feed', kind],
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => {
      const params: Record<string, unknown> = { page: pageParam, page_size: PAGE_SIZE }
      if (kind !== 'ALL') params.kind = kind
      return (await api.get<Feed>('/community/posts/', { params })).data
    },
    getNextPageParam: (last) => (last.has_next ? last.page + 1 : undefined),
  })

  const like = useMutation({
    mutationFn: async (post: Post) =>
      (await api.post<{ liked: boolean; like_count: number }>(
        `/community/posts/${post.slug}/like/`)).data,
    // Flip the heart immediately; the feed re-reads the true count on success.
    onMutate: async (post) => {
      await queryClient.cancelQueries({ queryKey: ['feed', kind] })
      const snapshot = queryClient.getQueryData(['feed', kind])
      queryClient.setQueryData(['feed', kind], (old: any) => patchFeed(old, post.slug, (p) => ({
        ...p,
        liked: !p.liked,
        like_count: Math.max(0, p.like_count + (p.liked ? -1 : 1)),
      })))
      return { snapshot }
    },
    onError: (_err, _post, context) => {
      // Put the heart back rather than leaving a like that never landed.
      if (context?.snapshot) queryClient.setQueryData(['feed', kind], context.snapshot)
    },
    onSuccess: (data, post) => {
      queryClient.setQueryData(['feed', kind], (old: any) => patchFeed(old, post.slug, (p) => ({
        ...p, liked: data.liked, like_count: data.like_count,
      })))
    },
  })

  const posts = feed.data?.pages.flatMap((page) => page.results) ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight">
          <MessagesSquare className="size-7 text-primary" />
          {t('community.title')}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground leading-relaxed">
          {t('community.subtitle')}
        </p>
      </header>

      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {KINDS.map((option) => (
          <Button
            key={option}
            size="sm"
            variant={kind === option ? 'default' : 'outline'}
            onClick={() => setKind(option)}
          >
            {option === 'ALL' ? t('community.allKinds') : t(`community.kind${option}`)}
          </Button>
        ))}
      </div>

      {feed.isLoading && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      )}

      {!feed.isLoading && posts.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12 text-center">
            <Illustration
              src="/illustrations/empty-state.png"
              alt={t('community.empty')}
              className="w-40 opacity-90"
            />
            <p className="text-muted-foreground">{t('community.empty')}</p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-5">
        {posts.map((post, i) => (
          <Reveal key={post.slug} delay={Math.min(i, 4) * 60}>
            <PostCard post={post} onToggleLike={(p) => like.mutate(p)} pending={like.isPending} />
          </Reveal>
        ))}
      </div>

      {feed.hasNextPage && (
        <div className="mt-8 text-center">
          <Button
            variant="outline"
            onClick={() => feed.fetchNextPage()}
            disabled={feed.isFetchingNextPage}
          >
            {feed.isFetchingNextPage ? t('common.loading') : t('common.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}

/** Rewrites one post inside every cached page of the infinite feed. */
function patchFeed(cache: any, slug: string, update: (post: Post) => Post) {
  if (!cache?.pages) return cache
  return {
    ...cache,
    pages: cache.pages.map((page: Feed) => ({
      ...page,
      results: page.results.map((post) => (post.slug === slug ? update(post) : post)),
    })),
  }
}
