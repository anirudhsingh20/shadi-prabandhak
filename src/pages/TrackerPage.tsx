import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { BudgetCharts } from '@/components/BudgetCharts'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { PaymentForm } from '@/components/PaymentForm'
import { PaymentStatusBadge } from '@/components/PaymentStatusBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sumPaymentsByStatus, syncCategorySpent } from '@/lib/budget'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { BudgetPaymentInput } from '@/lib/validations'
import type { BudgetCategory, BudgetPayment, BudgetPaymentStatus } from '@/lib/types'

export function TrackerPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editPay, setEditPay] = useState<BudgetPayment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | BudgetPaymentStatus>('all')

  const { data: categories = [] } = useQuery({
    queryKey: ['budget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as BudgetCategory[]
    },
  })

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['budget-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_payments')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BudgetPayment[]
    },
  })

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  )

  const totals = useMemo(() => sumPaymentsByStatus(payments), [payments])

  const statusChartData = useMemo(
    () => [
      { name: 'Paid' as const, value: totals.paid },
      { name: 'Pending' as const, value: totals.pending },
      { name: 'May come' as const, value: totals.mayCome },
    ],
    [totals],
  )

  const categoryChartData = useMemo(
    () =>
      categories.map((c) => ({
        name: c.name.length > 14 ? `${c.name.slice(0, 12)}…` : c.name,
        allocated: Number(c.allocated),
        paid: totals.paidByCategory[c.id] ?? 0,
      })),
    [categories, totals.paidByCategory],
  )

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return payments
    return payments.filter((p) => p.status === statusFilter)
  }, [payments, statusFilter])

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['budget'] })
    qc.invalidateQueries({ queryKey: ['budget-payments'] })
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const payment = payments.find((p) => p.id === id)
      const { error } = await supabase.from('budget_payments').delete().eq('id', id)
      if (error) throw error
      if (payment?.category_id) await syncCategorySpent(WEDDING_ID, [payment.category_id])
    },
    onSuccess: () => {
      toast.success('Payment deleted')
      invalidate()
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const savePayment = async (values: BudgetPaymentInput, id?: string) => {
    const prev = id ? payments.find((p) => p.id === id) : null
    const categoryId = values.category_id || null
    const payload = {
      title: values.title,
      amount: Number(values.amount),
      status: values.status,
      category_id: categoryId,
      due_date: values.due_date || null,
      notes: values.notes || null,
      wedding_id: WEDDING_ID,
    }
    const { error } = id
      ? await supabase.from('budget_payments').update(payload).eq('id', id)
      : await supabase.from('budget_payments').insert(payload)
    if (error) throw new Error(error.message)

    const toSync = [categoryId, prev?.category_id].filter(Boolean) as string[]
    if (toSync.length) await syncCategorySpent(WEDDING_ID, toSync)

    toast.success(id ? 'Payment updated' : 'Payment added')
    invalidate()
    setCreateOpen(false)
    setEditPay(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tracker"
        description="Payments — done, pending & may come"
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Add payment</DialogTitle></DialogHeader>
              <PaymentForm
                categories={categories}
                submitLabel="Add payment"
                onSubmit={(v) => savePayment(v)}
              />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid grid-cols-3 gap-2">
        <Card>
          <CardContent className="p-3">
            <p className="text-sm text-white/75">Paid</p>
            <p className="font-display text-xl font-semibold text-gold">{formatCurrency(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-sm text-white/75">Pending</p>
            <p className="font-display text-xl font-semibold text-white">{formatCurrency(totals.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-sm text-white/75">May come</p>
            <p className="font-display text-xl font-semibold text-white">{formatCurrency(totals.mayCome)}</p>
          </CardContent>
        </Card>
      </div>

      <p className="text-sm text-white/70">
        Categories & bank live on{' '}
        <Link to="/budget" className="font-medium text-gold underline-offset-4 hover:underline">Budget</Link>.
      </p>

      <BudgetCharts statusData={statusChartData} categoryData={categoryChartData} />

      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-xl font-semibold text-gold">Payments</h2>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="may_come">May come</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="text-sm text-muted-foreground">No payments in this filter.</p>
      )}
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-md border border-gold/30 bg-white/5 px-3 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-base font-semibold">{p.title}</p>
                  <PaymentStatusBadge status={p.status} />
                </div>
                <p className="mt-1 font-display text-lg font-semibold text-gold">
                  {formatCurrency(Number(p.amount))}
                </p>
                <p className="mt-0.5 text-sm text-white/70">
                  {[
                    p.category_id ? categoryMap[p.category_id] : null,
                    p.due_date ? `Due ${p.due_date}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No category'}
                </p>
                {p.notes && <p className="mt-1 text-sm text-white/60">{p.notes}</p>}
              </div>
              <div className="flex shrink-0 gap-0.5">
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setEditPay(p)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setDeleteId(p.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editPay} onOpenChange={(o) => !o && setEditPay(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit payment</DialogTitle></DialogHeader>
          {editPay && (
            <PaymentForm
              key={editPay.id}
              categories={categories}
              submitLabel="Save changes"
              defaultValues={{
                title: editPay.title,
                amount: Number(editPay.amount),
                status: editPay.status,
                category_id: editPay.category_id ?? '',
                due_date: editPay.due_date ?? '',
                notes: editPay.notes ?? '',
              }}
              onSubmit={(v) => savePayment(v, editPay.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete payment?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
