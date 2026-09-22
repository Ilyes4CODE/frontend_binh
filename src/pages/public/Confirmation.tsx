import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Download } from 'lucide-react'
import { api } from '@/lib/api'
import type { Registration } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Illustration } from '@/components/Illustration'

export default function Confirmation() {
  const { reference } = useParams<{ reference: string }>()
  const { t } = useTranslation()

  const { data, isLoading } = useQuery({
    queryKey: ['registration', reference],
    queryFn: async () => (await api.get<Registration>(`/registrations/${reference}/`)).data,
    enabled: !!reference,
  })

  if (isLoading) return <p className="p-12 text-center text-muted-foreground">{t('common.loading')}</p>
  if (!data) return null

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Illustration
        src="/illustrations/confirmation.png"
        alt=""
        className="mx-auto w-44 animate-in fade-in zoom-in-95 duration-500"
      />
      <h1 className="mt-4 flex animate-in items-center justify-center gap-2 text-2xl font-bold fade-in slide-in-from-bottom-2 duration-400 [animation-delay:120ms] [animation-fill-mode:backwards]">
        <CheckCircle2 className="size-6 animate-in text-primary zoom-in duration-300 [animation-delay:200ms] [animation-fill-mode:backwards]" />
        {t('confirmation.title')}
      </h1>
      <p className="mt-2 animate-in text-muted-foreground fade-in duration-400 [animation-delay:200ms] [animation-fill-mode:backwards]">
        {t('confirmation.subtitle')}
      </p>

      <Card className="mt-8 animate-in text-start fade-in slide-in-from-bottom-3 duration-400 [animation-delay:280ms] [animation-fill-mode:backwards]">
        <CardContent className="space-y-3 p-6">
          <Row label={t('confirmation.reference')} value={data.reference} strong />
          <Row label={t('confirmation.category')} value={data.category_display} />
          <Row label={t('confirmation.status')} value={t(`status.${data.status}`)} />
        </CardContent>
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">{t('confirmation.downloadHint')}</p>

      <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Button asChild size="lg">
          <a href={`/api/registrations/${data.reference}/pdf/`} download>
            <Download className="size-4" />
            {t('common.downloadPdf')}
          </a>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/">{t('confirmation.backHome')}</Link>
        </Button>
      </div>
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={strong ? 'font-mono text-base font-bold' : 'text-sm font-medium'}>{value}</span>
    </div>
  )
}
