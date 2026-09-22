import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightLeft, BadgeCheck, GitBranch, History, KeyRound, Power, PowerOff, UserPlus, Wallet,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { ActivityEntry, Paginated } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const ICONS: Record<string, typeof History> = {
  REGISTRATION_STATUS: BadgeCheck,
  REGISTRATION_PAYMENT: Wallet,
  REGISTRATION_TRANSFER: ArrowRightLeft,
  BRANCH_CREATED: GitBranch,
  BRANCH_UPDATED: GitBranch,
  BRANCH_DELETED: GitBranch,
  ACCOUNT_CREATED: UserPlus,
  ACCOUNT_UPDATED: UserPlus,
  ACCOUNT_DEACTIVATED: PowerOff,
  ACCOUNT_REACTIVATED: Power,
  PASSWORD_RESET: KeyRound,
}

/**
 * Who did what. Scoped by the server exactly like the candidates: a branch
 * manager sees their branch's history, a president their whole club's, the
 * national administrator everything.
 */
export default function AdminActivity() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['activity', page],
    queryFn: async () =>
      (await api.get<Paginated<ActivityEntry>>('/admin/activity/', { params: { page } })).data,
  })

  const rows = data?.results ?? []
  const locale = { ar: 'ar-DZ', vi: 'vi-VN' }[i18n.language] ?? 'en-GB'

  const describe = (entry: ActivityEntry) => {
    const from = entry.detail?.from as string | null | undefined
    const to = entry.detail?.to as string | null | undefined
    if (from !== undefined || to !== undefined) {
      const label = (value: string | null | undefined) =>
        value ? t(`hier.value.${value}`, { defaultValue: value }) : '—'
      return `${label(from)} → ${label(to)}`
    }
    return ''
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <History className="size-5 text-primary" />
          {t('hier.activity')}
        </h1>
        <p className="text-sm text-muted-foreground">{t('hier.activitySubtitle')}</p>
      </div>

      {!isLoading && rows.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-muted-foreground">{t('hier.noActivity')}</CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {rows.map((entry) => {
            const Icon = ICONS[entry.action] ?? History
            const change = describe(entry)
            return (
              <li key={entry.id} className="flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-secondary">
                  <Icon className="size-4 text-primary" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">
                    <span className="font-medium">{t(`hier.action.${entry.action}`, { defaultValue: entry.action_display })}</span>
                    {' · '}
                    <bdi className="font-mono text-xs">{entry.target}</bdi>
                    {change && <span className="text-muted-foreground"> · {change}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <bdi dir="ltr">{entry.actor_label || '—'}</bdi>
                    {' · '}
                    {new Date(entry.created_at).toLocaleString(locale)}
                  </p>
                </div>
                <div className="hidden shrink-0 flex-wrap justify-end gap-1 sm:flex">
                  {entry.club_name && <Badge variant="outline"><bdi>{entry.club_name}</bdi></Badge>}
                  {entry.center_name && <Badge variant="secondary"><bdi>{entry.center_name}</bdi></Badge>}
                </div>
              </li>
            )
          })}
        </ul>
      </Card>

      {(data?.previous || data?.next) && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={!data?.previous} onClick={() => setPage((p) => p - 1)}>
            {t('common.previous')}
          </Button>
          <Button variant="outline" size="sm" disabled={!data?.next} onClick={() => setPage((p) => p + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}
    </div>
  )
}
