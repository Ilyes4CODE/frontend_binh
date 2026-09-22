import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import type { AppliesTo, RequiredDocumentAdmin } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

// `key` is derived from the label by the backend, so it is never part of the form.
type FormState = Omit<RequiredDocumentAdmin, 'id' | 'key'>

const EMPTY_FORM: FormState = {
  label_ar: '', label_en: '', label_vi: '', applies_to: 'ALL', required: true, order: 0, active: true,
}

export default function AdminDocumentFields() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<RequiredDocumentAdmin | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)

  const { data = [] } = useQuery({
    queryKey: ['admin-required-documents'],
    queryFn: async () => (await api.get<RequiredDocumentAdmin[]>('/admin/required-documents/')).data,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-required-documents'] })
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (editing) return (await api.put(`/admin/required-documents/${editing.id}/`, form)).data
      return (await api.post('/admin/required-documents/', form)).data
    },
    onSuccess: () => {
      invalidate()
      setOpen(false)
      toast.success(t('admin.saved'))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => api.delete(`/admin/required-documents/${id}/`),
    onSuccess: () => {
      invalidate()
      toast.success(t('admin.saved'))
    },
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, order: data.length })
    setOpen(true)
  }

  function openEdit(doc: RequiredDocumentAdmin) {
    setEditing(doc)
    const { id: _id, key: _key, ...rest } = doc
    setForm(rest)
    setOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{t('admin.documentFields')}</h1>
          <p className="text-sm text-muted-foreground">{t('admin.docFieldsSubtitle')}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}><Plus className="size-4" />{t('admin.addDocument')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t('admin.editDocument') : t('admin.addDocument')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>{t('admin.docLabelAr')}</Label>
                <Input dir="rtl" value={form.label_ar} onChange={(e) => setForm({ ...form, label_ar: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('admin.docLabelEn')}</Label>
                <Input value={form.label_en} onChange={(e) => setForm({ ...form, label_en: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('admin.docLabelVi')}</Label>
                <Input value={form.label_vi} onChange={(e) => setForm({ ...form, label_vi: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('admin.docAppliesTo')}</Label>
                <Select value={form.applies_to} onValueChange={(v) => setForm({ ...form, applies_to: v as AppliesTo })}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{t('admin.docAppliesToALL')}</SelectItem>
                    <SelectItem value="MINOR">{t('admin.docAppliesToMINOR')}</SelectItem>
                    <SelectItem value="MAJOR">{t('admin.docAppliesToMAJOR')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: v })} />
                  {t('admin.docRequired')}
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} />
                  {t('admin.docActive')}
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={!form.label_en || !form.label_ar}>{t('common.save')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('admin.docLabelEn')}</TableHead>
                <TableHead>{t('admin.docLabelAr')}</TableHead>
                <TableHead>{t('admin.docAppliesTo')}</TableHead>
                <TableHead>{t('admin.docRequired')}</TableHead>
                <TableHead>{t('admin.docActive')}</TableHead>
                <TableHead className="text-end">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.label_en}</TableCell>
                  <TableCell dir="rtl" className="text-start">{doc.label_ar}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{t(`admin.docAppliesTo${doc.applies_to}`)}</Badge>
                  </TableCell>
                  <TableCell>{doc.required ? t('common.yes') : t('common.no')}</TableCell>
                  <TableCell>{doc.active ? t('common.yes') : t('common.no')}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(doc)}>
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm(t('admin.deleteConfirm'))) deleteMutation.mutate(doc.id)
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
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
