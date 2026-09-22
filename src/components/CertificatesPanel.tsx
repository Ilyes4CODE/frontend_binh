import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Award, Download, Medal } from 'lucide-react'
import { api } from '@/lib/api'
import type { AwardKind, AwardRow } from '@/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const AWARD_STYLES: Record<AwardKind, string> = {
  GOLD: 'bg-brand-gold text-brand-gold-foreground',
  SILVER: 'bg-muted text-foreground',
  BRONZE: 'bg-secondary text-secondary-foreground',
  PARTICIPATION: 'bg-muted/60 text-muted-foreground',
}

/** Certificates are generated server-side, so downloads go through the authed API. */
async function downloadPdf(url: string, filename: string) {
  const response = await api.get(url, { responseType: 'blob' })
  const objectUrl = URL.createObjectURL(response.data as Blob)
  const a = document.createElement('a')
  a.href = objectUrl
  a.download = filename
  a.click()
  URL.revokeObjectURL(objectUrl)
}

export function CertificatesPanel({ competitionId }: { competitionId: number }) {
  const { t } = useTranslation()

  const { data: awards = [] } = useQuery({
    queryKey: ['competition-awards', competitionId],
    queryFn: async () => (await api.get<AwardRow[]>(`/admin/competitions/${competitionId}/awards/`)).data,
  })

  if (awards.length === 0) {
    return <p className="text-muted-foreground">{t('comp.noAwardsYet')}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t('comp.certificatesSubtitle')}</p>
        <Button
          onClick={() =>
            downloadPdf(`/admin/competitions/${competitionId}/certificates/`, `certificates-${competitionId}.pdf`)
          }
        >
          <Download className="size-4" />
          {t('comp.downloadAllCertificates')}
        </Button>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('comp.participantName')}</TableHead>
                <TableHead>{t('comp.club')}</TableHead>
                <TableHead>{t('comp.certificates')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awards.map((row) => (
                <TableRow key={row.participant.id}>
                  <TableCell className="font-medium">{row.participant.name}</TableCell>
                  <TableCell className="text-muted-foreground">{row.participant.club || '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${AWARD_STYLES[row.award]}`}
                    >
                      {row.award === 'PARTICIPATION' ? <Award className="size-3.5" /> : <Medal className="size-3.5" />}
                      {t(`comp.award${row.award}`)}
                    </span>
                  </TableCell>
                  <TableCell className="text-end">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        downloadPdf(
                          `/admin/competitions/${competitionId}/certificates/${row.participant.id}/`,
                          `certificate-${row.participant.name}.pdf`,
                        )
                      }
                    >
                      <Download className="size-4" />
                      {t('comp.downloadCertificate')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
