import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminStats } from '@/types'
import { CATEGORY_ORDER } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const ORDINAL_VARS = [
  'var(--chart-ordinal-1)', 'var(--chart-ordinal-2)', 'var(--chart-ordinal-3)', 'var(--chart-ordinal-4)',
  'var(--chart-ordinal-5)', 'var(--chart-ordinal-6)', 'var(--chart-ordinal-7)', 'var(--chart-ordinal-8)',
]

export default function AdminDashboard() {
  const { t } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => (await api.get<AdminStats>('/admin/stats/')).data,
  })

  const tiles = data
    ? [
        { label: t('admin.statTotal'), value: data.total },
        { label: t('admin.statMinors'), value: data.minors },
        { label: t('admin.statMajors'), value: data.majors },
        { label: t('admin.statPending'), value: data.pending },
        { label: t('admin.statPaid'), value: data.paid },
        { label: t('admin.statUnpaid'), value: data.unpaid },
      ]
    : []

  const maxCount = data ? Math.max(1, ...CATEGORY_ORDER.map((c) => data.by_category[c] ?? 0)) : 1

  // Bars start collapsed and grow once the data has painted.
  const [barsGrown, setBarsGrown] = useState(false)
  useEffect(() => {
    if (!data) return
    const id = requestAnimationFrame(() => setBarsGrown(true))
    return () => cancelAnimationFrame(id)
  }, [data])

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">{t('admin.dashboard')}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-3 w-16 rounded bg-muted" />
                  <div className="mt-3 h-7 w-10 rounded bg-muted" />
                </CardContent>
              </Card>
            ))
          : tiles.map((tile, i) => (
              <Card
                key={tile.label}
                style={{ animationDelay: `${i * 60}ms` }}
                className="animate-in transition-shadow duration-200 fade-in slide-in-from-bottom-2 [animation-duration:400ms] [animation-fill-mode:backwards] hover:shadow-md"
              >
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{tile.label}</p>
                  <p className="mt-1 text-2xl font-bold">{tile.value}</p>
                </CardContent>
              </Card>
            ))}
      </div>

      {data && data.breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {data.breakdown_by === 'center' ? t('admin.byCenter') : t('admin.byClub')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.breakdown.map((row, i) => (
              <div
                key={`${row.id ?? 'none'}-${i}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-4 py-2.5"
              >
                <bdi className="min-w-0 flex-1 truncate font-medium">{row.name}</bdi>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {t('admin.paidOfTotal', { paid: row.paid, total: row.total })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('admin.byCategory')}</CardTitle>
        </CardHeader>
        <CardContent>
          {data && (
            <div className="space-y-3">
              {CATEGORY_ORDER.map((code, i) => {
                const count = data.by_category[code] ?? 0
                const pct = Math.max(4, Math.round((count / maxCount) * 100))
                return (
                  <div key={code} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 text-sm text-muted-foreground">{t(`categories.${code}`)}</span>
                    <div className="h-6 flex-1 overflow-hidden rounded-sm bg-muted">
                      {/* grows via scaleX (compositor-friendly) rather than animating width */}
                      <div
                        className="h-full origin-left rounded-sm transition-transform duration-500 ease-out rtl:origin-right"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: ORDINAL_VARS[i],
                          transform: barsGrown ? 'scaleX(1)' : 'scaleX(0)',
                          transitionDelay: `${i * 50}ms`,
                        }}
                        title={`${t(`categories.${code}`)}: ${count}`}
                      />
                    </div>
                    <span className="w-8 shrink-0 text-end text-sm font-semibold tabular-nums">{count}</span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
