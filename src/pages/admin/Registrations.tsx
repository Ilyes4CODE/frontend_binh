import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/api'
import { CATEGORY_ORDER, type Paginated, type RegistrationListItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Illustration } from '@/components/Illustration'
import { cn } from '@/lib/utils'
import { IdCard, Printer, X } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Label } from '@/components/ui/label'
import type { Club, TrainingGroup } from '@/types'
import { toast } from 'sonner'

const ALL = '__all__'

export default function AdminRegistrations() {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(ALL)
  const [isMinor, setIsMinor] = useState(ALL)
  const [status, setStatus] = useState(ALL)
  const [paymentStatus, setPaymentStatus] = useState(ALL)
  const [gender, setGender] = useState(ALL)
  const [club, setClub] = useState(ALL)
  const [center, setCenter] = useState(ALL)
  const [group, setGroup] = useState(ALL)
  const [selected, setSelected] = useState<number[]>([])
  const { user } = useAuth()
  const isSuperAdmin = user?.is_super_admin ?? false
  const isBranchManager = user?.is_branch_manager ?? false

  // Club records are club-level data; a branch manager is refused them, and
  // has no club or branch to filter by anyway — they only ever see one branch.
  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: async () => (await api.get<Club[]>('/admin/clubs/')).data,
    enabled: Boolean(user) && !isBranchManager,
  })
  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: async () => (await api.get<TrainingGroup[]>('/admin/groups/')).data,
  })

  // Centers of the chosen club, or of every club the caller can see.
  const centerOptions = (club !== ALL
    ? clubs.find((c) => String(c.id) === club)?.centers ?? []
    : clubs.flatMap((c) => c.centers))

  const filters = { search, category, isMinor, status, paymentStatus, gender, club, center, group }
  const hasFilters = Object.values(filters).some((v) => v !== '' && v !== ALL)

  function clearFilters() {
    setSearch(''); setCategory(ALL); setIsMinor(ALL); setStatus(ALL)
    setPaymentStatus(ALL); setGender(ALL); setClub(ALL); setCenter(ALL); setGroup(ALL)
  }

  /** The same filters the table is using, for the API and the printout. */
  const queryParams = {
    search: search || undefined,
    category: category !== ALL ? category : undefined,
    is_minor: isMinor !== ALL ? isMinor : undefined,
    status: status !== ALL ? status : undefined,
    payment_status: paymentStatus !== ALL ? paymentStatus : undefined,
    gender: gender !== ALL ? gender : undefined,
    club: club !== ALL ? club : undefined,
    center: center !== ALL ? center : undefined,
    group: group !== ALL ? group : undefined,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['admin-registrations', queryParams],
    queryFn: async () =>
      (await api.get<Paginated<RegistrationListItem>>('/admin/registrations/', { params: queryParams })).data,
  })

  const results = data?.results ?? []

  // Only paid members can be issued a badge, so only those rows are selectable.
  const paidRows = results.filter((r) => r.payment_status === 'PAID')
  const selectedPaid = paidRows.filter((r) => selected.includes(r.id))
  const allPaidSelected = paidRows.length > 0 && selectedPaid.length === paidRows.length

  function toggleRow(id: number) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function toggleAll() {
    setSelected(allPaidSelected ? [] : paidRows.map((r) => r.id))
  }

  function saveBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  /** Badges for the rows the admin ticked. */
  async function downloadSelectedBadges() {
    try {
      const response = await api.post('/admin/badges/', { ids: selected }, { responseType: 'blob' })
      saveBlob(response.data as Blob, 'badges.pdf')
    } catch {
      toast.error(t('admin.badgeNoPaid'))
    }
  }

  /** The candidate list exactly as filtered on screen. */
  async function printList() {
    const response = await api.get('/admin/registrations-print/', {
      params: queryParams, responseType: 'blob',
    })
    saveBlob(response.data as Blob, 'candidates.pdf')
  }

  /** Every paid member's badge, on printable sheets. */
  async function downloadAllBadges() {
    try {
      const response = await api.get('/admin/badges/', { responseType: 'blob' })
      saveBlob(response.data as Blob, 'badges.pdf')
    } catch {
      toast.error(t('admin.badgeNoPaid'))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold">{t('admin.registrations')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {selectedPaid.length > 0 && (
            <Button size="sm" onClick={downloadSelectedBadges}>
              <IdCard className="size-4" />
              {t('admin.badgeSelected', { count: selectedPaid.length })}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={printList} title={t('admin.printListHint')}>
            <Printer className="size-4" />
            {t('admin.printList')}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadAllBadges}>
            <IdCard className="size-4" />
            {t('admin.badgeAll')}
          </Button>
        </div>
      </div>

      <Card>
        {/* Every control is labelled — an unlabelled row of "All" dropdowns
            gives no clue which is which. */}
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <Filter label={t('admin.filterSearch')} className="min-w-56 flex-1">
            <Input
              placeholder={t('admin.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Filter>

          <Filter label={t('admin.filterGender')}>
            <FilterSelect
              value={gender}
              onChange={setGender}
              allLabel={t('common.all')}
              options={[
                { value: 'MALE', label: t('register.genderMALE') },
                { value: 'FEMALE', label: t('register.genderFEMALE') },
              ]}
            />
          </Filter>

          <Filter label={t('admin.filterCategory')}>
            <FilterSelect
              value={category}
              onChange={setCategory}
              allLabel={t('common.all')}
              options={CATEGORY_ORDER.map((c) => ({ value: c, label: t(`categories.${c}`) }))}
            />
          </Filter>

          <Filter label={t('admin.filterMinor')}>
            <FilterSelect
              value={isMinor}
              onChange={setIsMinor}
              allLabel={t('common.all')}
              options={[
                { value: 'true', label: t('admin.statMinors') },
                { value: 'false', label: t('admin.statMajors') },
              ]}
            />
          </Filter>

          <Filter label={t('admin.filterStatus')}>
            <FilterSelect
              value={status}
              onChange={setStatus}
              allLabel={t('common.all')}
              options={(['PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => ({
                value: s, label: t(`status.${s}`),
              }))}
            />
          </Filter>

          <Filter label={t('admin.filterPayment')}>
            <FilterSelect
              value={paymentStatus}
              onChange={setPaymentStatus}
              allLabel={t('common.all')}
              options={(['PAID', 'UNPAID'] as const).map((s) => ({ value: s, label: t(`status.${s}`) }))}
            />
          </Filter>

          {isSuperAdmin && clubs.length > 0 && (
            <Filter label={t('admin.filterClub')}>
              <FilterSelect
                value={club}
                onChange={(value) => { setClub(value); setCenter(ALL) }}
                allLabel={t('common.all')}
                options={clubs.map((c) => ({ value: String(c.id), label: c.name_en }))}
              />
            </Filter>
          )}

          {!isBranchManager && centerOptions.length > 0 && (
            <Filter label={t('admin.filterCenter')}>
              <FilterSelect
                value={center}
                onChange={setCenter}
                allLabel={t('common.all')}
                options={centerOptions.map((c) => ({ value: String(c.id), label: c.name_en }))}
              />
            </Filter>
          )}

          {groups.length > 0 && (
            <Filter label={t('admin.filterGroup')}>
              <FilterSelect
                value={group}
                onChange={setGroup}
                allLabel={t('common.all')}
                options={groups.map((g) => ({ value: String(g.id), label: g.name_en }))}
              />
            </Filter>
          )}

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="size-4" />
              {t('admin.clearFilters')}
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allPaidSelected}
                    disabled={paidRows.length === 0}
                    onCheckedChange={toggleAll}
                    aria-label={t('admin.badgeSelectAll')}
                  />
                </TableHead>
                <TableHead>{t('admin.colReference')}</TableHead>
                <TableHead>{t('admin.colName')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('admin.colGender')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('org.club')}</TableHead>
                <TableHead className="hidden sm:table-cell">{t('admin.colCategory')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('admin.colAge')}</TableHead>
                <TableHead>{t('admin.colStatus')}</TableHead>
                <TableHead>{t('admin.colPayment')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('admin.colDocuments')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('admin.colDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoading && results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                    <Illustration src="/illustrations/empty-state.png" alt="" className="mx-auto mb-2 w-36" />
                    {t('admin.noResults')}
                  </TableCell>
                </TableRow>
              )}
              {results.map((reg) => (
                <TableRow key={reg.id} className="cursor-pointer">
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(reg.id)}
                      disabled={reg.payment_status !== 'PAID'}
                      onCheckedChange={() => toggleRow(reg.id)}
                      title={reg.payment_status === 'PAID' ? undefined : t('admin.badgeNeedsPaid')}
                      aria-label={`${reg.first_name} ${reg.last_name}`}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    <Link to={`/admin/registrations/${reg.id}`} className="hover:underline">{reg.reference}</Link>
                  </TableCell>
                  <TableCell>{reg.first_name} {reg.last_name}</TableCell>
                  <TableCell className="hidden text-sm lg:table-cell">{reg.gender_display || '—'}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    <bdi>{reg.club_name || '—'}</bdi>
                    {reg.center_name && <span className="block text-xs">{reg.center_name}</span>}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{reg.category_display}</TableCell>
                  <TableCell className="hidden lg:table-cell">{reg.age_at_registration}</TableCell>
                  <TableCell>
                    <Badge variant={reg.status === 'APPROVED' ? 'default' : reg.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                      {t(`status.${reg.status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={reg.payment_status === 'PAID' ? 'default' : 'outline'}>
                      {t(`status.${reg.payment_status}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{reg.document_count}</TableCell>
                  <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                    {new Date(reg.created_at).toLocaleDateString()}
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


function Filter({ label, className, children }: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  )
}

function FilterSelect({ value, onChange, allLabel, options }: {
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: { value: string; label: string }[]
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
