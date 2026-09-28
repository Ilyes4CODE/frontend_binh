import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, TriangleAlert } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { CategoryCode, Center, SiteSettings } from '@/types'
import { Button } from '@/components/ui/button'

// Grouped and ordered the way the home page presents them, so a manager meets
// the categories in the order candidates do.
const GROUPS: { key: 'Youth' | 'Adults'; codes: CategoryCode[] }[] = [
  { key: 'Youth', codes: ['JUNIOR', 'CADET', 'MINIME', 'BENJAMIN', 'POUSSIN', 'MINIBAD'] },
  { key: 'Adults', codes: ['SENIOR', 'VETERAN'] },
]
const ALL = GROUPS.flatMap((g) => g.codes)

/**
 * Opens and closes one branch's registrations, category by category.
 *
 * Changes are staged and saved together rather than sent on every click:
 * "close all" is then one change in the activity log instead of eight, and a
 * half-finished edit never reaches candidates.
 */
export function BranchCategoriesEditor({
  center,
}: {
  center: Pick<Center, 'id' | 'open_categories'>
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const saved = useMemo(() => new Set(center.open_categories), [center.open_categories])
  const [open, setOpen] = useState<Set<CategoryCode>>(saved)

  // Follow the server whenever it changes underneath us — after a save, or
  // when the page refetches.
  useEffect(() => setOpen(new Set(center.open_categories)), [center.id, center.open_categories])

  const dirty = open.size !== saved.size || [...open].some((c) => !saved.has(c))

  // The national switch overrides every branch. Say so here, or a manager
  // opens categories and wonders why nobody can register.
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => (await api.get<SiteSettings>('/settings/')).data,
  })

  const save = useMutation({
    mutationFn: async () =>
      (await api.patch<Center>(`/admin/centers/${center.id}/categories/`, {
        open_categories: ALL.filter((c) => open.has(c)),
      })).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] })
      queryClient.invalidateQueries({ queryKey: ['my-branch'] })
      queryClient.invalidateQueries({ queryKey: ['directory'] })
      queryClient.invalidateQueries({ queryKey: ['activity'] })
      toast.success(t('admin.saved'))
    },
    onError: () => toast.error(t('register.genericError')),
  })

  const toggle = (code: CategoryCode) =>
    setOpen((current) => {
      const next = new Set(current)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })

  return (
    <div className="space-y-3">
      {settings && !settings.registrations_open && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 p-2.5 text-xs text-amber-900">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
          {t('branchCat.nationalOff')}
        </p>
      )}

      {GROUPS.map((group) => (
        <div key={group.key} className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            {t(`home.categoriesGroup${group.key}`)}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.codes.map((code) => {
              const isOpen = open.has(code)
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={isOpen}
                  title={t(`categories.${code}_range`)}
                  onClick={() => toggle(code)}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                    isOpen
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background text-muted-foreground line-through decoration-1 hover:bg-muted',
                  )}
                >
                  {isOpen && <Check className="size-3" />}
                  {t(`categories.${code}`)}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(new Set(ALL))}>
            {t('branchCat.openAll')}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(new Set())}>
            {t('branchCat.closeAll')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-xs', open.size === 0 ? 'text-destructive' : 'text-muted-foreground')}>
            {dirty
              ? t('branchCat.unsaved')
              : open.size === 0
                ? t('branchCat.noneOpen')
                : t('branchCat.openCount', { open: open.size, total: ALL.length })}
          </span>
          <Button type="button" size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
            {t('common.save')}
          </Button>
        </div>
      </div>
    </div>
  )
}
