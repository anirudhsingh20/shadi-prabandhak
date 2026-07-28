import { useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, Clock, HelpCircle, Plus, Trash2, X } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { PaymentForm } from '@/components/PaymentForm'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { PAYMENT_STATUS_LABEL, sumPaymentsByStatus, syncCategorySpent } from '@/lib/budget'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { BudgetPaymentInput } from '@/lib/validations'
import type { BudgetCategory, BudgetPayment, BudgetPaymentStatus } from '@/lib/types'

type StatusFilter = 'all' | BudgetPaymentStatus

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Paid' },
  { value: 'may_come', label: 'May come' },
]

const STATUS_TONE: Record<
  BudgetPaymentStatus,
  { amount: string; chip: string; avatar: string; verb: string }
> = {
  done: {
    amount: 'text-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-300',
    avatar: 'bg-emerald-500/20 text-emerald-300',
    verb: 'paid',
  },
  pending: {
    amount: 'text-amber-300',
    chip: 'bg-amber-500/15 text-amber-200',
    avatar: 'bg-amber-500/20 text-amber-200',
    verb: 'pending',
  },
  may_come: {
    amount: 'text-white/55',
    chip: 'bg-white/10 text-white/65',
    avatar: 'bg-white/10 text-white/60',
    verb: 'may come',
  },
}

function initials(title: string) {
  const parts = title.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function formatShortDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function monthKey(iso: string | null | undefined, fallbackIso: string) {
  const raw = iso || fallbackIso.slice(0, 10)
  const d = new Date(`${raw}T12:00:00`)
  if (Number.isNaN(d.getTime())) return 'Other'
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function PaymentDrawerShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      dismissible={false}
      shouldScaleBackground={false}
      repositionInputs={false}
      fixed
    >
      <DrawerContent>
        <DrawerHeader className="relative shrink-0 pr-10 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1 h-9 w-9 text-white/70 hover:text-gold"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-2">
          {children}
        </div>
        {footer ? <DrawerFooter className="shrink-0 border-t border-gold/20">{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  )
}

function ExpenseRow({
  payment,
  categoryName,
  onOpen,
}: {
  payment: BudgetPayment
  categoryName?: string
  onOpen: () => void
}) {
  const tone = STATUS_TONE[payment.status]
  const dateLabel = formatShortDate(payment.due_date) ?? formatShortDate(payment.created_at.slice(0, 10))
  const meta = [categoryName, dateLabel].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide',
          tone.avatar,
        )}
        aria-hidden
      >
        {initials(payment.title)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-white/90">{payment.title}</span>
        <span className="mt-0.5 block truncate text-xs text-white/50">
          {meta || 'No category'}
          <span className="text-white/35"> · {PAYMENT_STATUS_LABEL[payment.status]}</span>
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className={cn('block font-display text-[15px] font-semibold tabular-nums', tone.amount)}>
          {formatCurrency(Number(payment.amount))}
        </span>
        <span className={cn('mt-0.5 block text-[10px] font-medium uppercase tracking-wide', tone.amount)}>
          {tone.verb}
        </span>
      </span>
    </button>
  )
}

export function PaymentsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editPay, setEditPay] = useState<BudgetPayment | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

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
  const outstanding = totals.pending + totals.mayCome
  const totalAll = totals.paid + outstanding

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return payments
    return payments.filter((p) => p.status === statusFilter)
  }, [payments, statusFilter])

  const grouped = useMemo(() => {
    const order: string[] = []
    const map = new Map<string, BudgetPayment[]>()
    const sorted = [...filtered].sort((a, b) => {
      const da = a.due_date || a.created_at.slice(0, 10)
      const db = b.due_date || b.created_at.slice(0, 10)
      if (da !== db) return db.localeCompare(da)
      return b.created_at.localeCompare(a.created_at)
    })
    for (const p of sorted) {
      const key = monthKey(p.due_date, p.created_at)
      if (!map.has(key)) {
        map.set(key, [])
        order.push(key)
      }
      map.get(key)!.push(p)
    }
    return order.map((label) => ({ label, items: map.get(label)! }))
  }, [filtered])

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
      setEditPay(null)
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
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        }
      />

      {/* Splitwise-style balance banner */}
      <div className="overflow-hidden rounded-xl border border-gold/30 bg-gradient-to-b from-white/[0.06] to-transparent">
        <div className="px-4 pb-3 pt-4 text-center">
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/50">Outstanding</p>
          <p
            className={cn(
              'mt-1 font-display text-3xl font-semibold tabular-nums',
              outstanding > 0 ? 'text-amber-300' : 'text-emerald-400',
            )}
          >
            {formatCurrency(outstanding)}
          </p>
          <p className="mt-1 text-xs text-white/45">
            {outstanding > 0
              ? `${formatCurrencyCompact(totals.pending)} pending · ${formatCurrencyCompact(totals.mayCome)} may come`
              : 'All caught up'}
          </p>
        </div>
        <div className="grid grid-cols-3 divide-x divide-gold/20 border-t border-gold/25">
          <div className="px-2 py-2.5 text-center">
            <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
              <Check className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <p className="text-[10px] uppercase tracking-wide text-white/45">Paid</p>
            <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-emerald-400">
              {formatCurrencyCompact(totals.paid)}
            </p>
          </div>
          <div className="px-2 py-2.5 text-center">
            <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/15">
              <Clock className="h-3.5 w-3.5 text-amber-300" />
            </div>
            <p className="text-[10px] uppercase tracking-wide text-white/45">Pending</p>
            <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-amber-300">
              {formatCurrencyCompact(totals.pending)}
            </p>
          </div>
          <div className="px-2 py-2.5 text-center">
            <div className="mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
              <HelpCircle className="h-3.5 w-3.5 text-white/55" />
            </div>
            <p className="text-[10px] uppercase tracking-wide text-white/45">May come</p>
            <p className="mt-0.5 font-display text-sm font-semibold tabular-nums text-white/65">
              {formatCurrencyCompact(totals.mayCome)}
            </p>
          </div>
        </div>
        {totalAll > 0 && (
          <div className="h-1.5 overflow-hidden bg-white/5">
            <div
              className="h-full bg-emerald-500/70 transition-all"
              style={{ width: `${Math.min(100, (totals.paid / totalAll) * 100)}%` }}
            />
          </div>
        )}
      </div>

      <p className="text-center text-xs text-white/45">
        Categories & bank on{' '}
        <Link to="/budget" className="text-gold underline-offset-2 hover:underline">
          Budget
        </Link>
      </p>

      {/* Filter chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {FILTERS.map((f) => {
          const active = statusFilter === f.value
          const count =
            f.value === 'all'
              ? payments.length
              : payments.filter((p) => p.status === f.value).length
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                  ? 'border-transparent bg-gold text-gold-foreground'
                  : 'border-gold/25 text-white/65 hover:bg-white/5',
              )}
            >
              {f.label}
              <span className={cn('ml-1 tabular-nums', active ? 'opacity-80' : 'text-white/40')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {isLoading && <p className="py-10 text-center text-sm text-white/50">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="py-14 text-center">
          <p className="text-sm text-white/55">No payments here yet.</p>
          <Button size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add payment
          </Button>
        </div>
      )}

      {/* Expense list */}
      <div className="space-y-4">
        {grouped.map((group) => (
          <section key={group.label}>
            <h2 className="sticky top-0 z-[1] -mx-1 mb-0.5 bg-[#0d0718]/90 px-1 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40 backdrop-blur-sm">
              {group.label}
            </h2>
            <div className="divide-y divide-white/[0.06]">
              {group.items.map((p) => (
                <ExpenseRow
                  key={p.id}
                  payment={p}
                  categoryName={p.category_id ? categoryMap[p.category_id] : undefined}
                  onOpen={() => setEditPay(p)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <PaymentDrawerShell
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add payment"
        description="Log a new wedding payment."
      >
        <PaymentForm
          key={createOpen ? 'create-open' : 'create-closed'}
          categories={categories}
          submitLabel="Add payment"
          onSubmit={(v) => savePayment(v)}
        />
      </PaymentDrawerShell>

      <PaymentDrawerShell
        open={!!editPay}
        onOpenChange={(o) => !o && setEditPay(null)}
        title="Edit payment"
        description="Update or delete this payment."
        footer={
          editPay ? (
            <Button
              type="button"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => setDeleteId(editPay.id)}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete payment
            </Button>
          ) : null
        }
      >
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
      </PaymentDrawerShell>

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
