import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowUpDown, History, Layers, Plus, Search, X } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { PaymentForm, type PaymentImageChange } from '@/components/PaymentForm'
import { PaymentDrawerPortalContext } from '@/components/PaymentDrawerPortalContext'
import { PaymentOptionCatalogDrawer } from '@/components/PaymentOptionCatalogDrawer'
import { isPaymentTitleMenuTarget } from '@/components/PaymentTitleInput'
import { PaymentTimelineDrawer } from '@/components/PaymentTimelineDrawer'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { recentPaymentTitles, sumPaymentsByStatus, syncCategorySpent } from '@/lib/budget'
import {
  deletePaymentImages,
  uploadPaymentImages,
} from '@/lib/payment-image'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { BudgetPaymentInput } from '@/lib/validations'
import type {
  BudgetCategory,
  BudgetPayment,
  BudgetPaymentStatus,
  PaymentMakerType,
  PaymentSourceType,
} from '@/lib/types'

type StatusFilter = 'all' | BudgetPaymentStatus
type CategoryFilter = 'all' | 'none' | string
type SortKey = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'title_asc'
type GroupBy = 'month' | 'category' | 'none'

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'done', label: 'Paid' },
  { value: 'may_come', label: 'May come' },
]

const SORT_OPTIONS: { value: SortKey; label: string; short: string }[] = [
  { value: 'date_desc', label: 'Newest first', short: 'Newest' },
  { value: 'date_asc', label: 'Oldest first', short: 'Oldest' },
  { value: 'amount_desc', label: 'Amount: high → low', short: 'Amt ↓' },
  { value: 'amount_asc', label: 'Amount: low → high', short: 'Amt ↑' },
  { value: 'title_asc', label: 'Name: A → Z', short: 'A–Z' },
]

const GROUP_OPTIONS: { value: GroupBy; label: string; short: string }[] = [
  { value: 'month', label: 'By month', short: 'Month' },
  { value: 'category', label: 'By category', short: 'Category' },
  { value: 'none', label: 'No grouping', short: 'Flat' },
]

function paymentDate(p: BudgetPayment) {
  return p.due_date || p.created_at.slice(0, 10)
}

function sortPayments(list: BudgetPayment[], sort: SortKey) {
  return [...list].sort((a, b) => {
    if (sort === 'amount_desc') return Number(b.amount) - Number(a.amount)
    if (sort === 'amount_asc') return Number(a.amount) - Number(b.amount)
    if (sort === 'title_asc') return a.title.localeCompare(b.title)
    const da = paymentDate(a)
    const db = paymentDate(b)
    if (da !== db) return sort === 'date_asc' ? da.localeCompare(db) : db.localeCompare(da)
    return sort === 'date_asc'
      ? a.created_at.localeCompare(b.created_at)
      : b.created_at.localeCompare(a.created_at)
  })
}

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
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const portalHostRef = useRef<HTMLDivElement>(null)
  const [portalHost, setPortalHost] = useState<HTMLElement | null>(null)
  const setPortalHostRef = useCallback((node: HTMLDivElement | null) => {
    portalHostRef.current = node
    setPortalHost(node)
  }, [])

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      dismissible={false}
      shouldScaleBackground={false}
      repositionInputs={false}
      fixed
    >
      <DrawerContent
        className="max-h-[min(92dvh,820px)] overflow-hidden"
        onPointerDownOutside={(e) => {
          if (isPaymentTitleMenuTarget(e.target)) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (isPaymentTitleMenuTarget(e.target)) e.preventDefault()
        }}
      >
        <DrawerHeader className="relative shrink-0 pr-10 text-left">
          <DrawerTitle>{title}</DrawerTitle>
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
        <PaymentDrawerPortalContext.Provider value={portalHost}>
          <div
            ref={setPortalHostRef}
            className="relative flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div
              data-payment-drawer-scroll
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-2 [touch-action:pan-y]"
            >
              {children}
            </div>
          </div>
        </PaymentDrawerPortalContext.Provider>
        {footer ? <DrawerFooter className="shrink-0 border-t border-gold/20">{footer}</DrawerFooter> : null}
      </DrawerContent>
    </Drawer>
  )
}

function ExpenseRow({
  payment,
  categoryName,
  madeByLabel,
  sourceLabel,
  onOpen,
}: {
  payment: BudgetPayment
  categoryName?: string
  madeByLabel?: string
  sourceLabel?: string
  onOpen: () => void
}) {
  const tone = STATUS_TONE[payment.status]
  const dateLabel = formatShortDate(payment.due_date) ?? formatShortDate(payment.created_at.slice(0, 10))
  const meta = [categoryName, madeByLabel, sourceLabel, dateLabel].filter(Boolean).join(' · ')

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 px-1 py-2.5 text-left transition-colors hover:bg-white/[0.04] active:bg-white/[0.06]"
    >
      {payment.image_urls?.[0] ? (
        <img
          src={payment.image_urls[0]}
          alt=""
          className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-white/10"
        />
      ) : (
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tracking-wide',
            tone.avatar,
          )}
          aria-hidden
        >
          {initials(payment.title)}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-medium text-white/90">{payment.title}</span>
        <span className="mt-0.5 block truncate text-[10px] leading-snug text-white/45">
          {meta || 'No category'}
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
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date_desc')
  const [groupBy, setGroupBy] = useState<GroupBy>('month')
  const [search, setSearch] = useState('')
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [makersOpen, setMakersOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)

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

  const { data: makers = [] } = useQuery({
    queryKey: ['payment_makers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_makers')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as PaymentMakerType[]
    },
  })

  const { data: sources = [] } = useQuery({
    queryKey: ['payment_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payment_sources')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as PaymentSourceType[]
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

  const makerMap = useMemo(
    () => Object.fromEntries(makers.map((m) => [m.key, m.label])),
    [makers],
  )

  const sourceMap = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.key, s.label])),
    [sources],
  )

  const makerUsage = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of payments) {
      if (!p.made_by) continue
      counts[p.made_by] = (counts[p.made_by] ?? 0) + 1
    }
    return counts
  }, [payments])

  const sourceUsage = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const p of payments) {
      if (!p.payment_source) continue
      counts[p.payment_source] = (counts[p.payment_source] ?? 0) + 1
    }
    return counts
  }, [payments])

  const titleSuggestions = useMemo(() => recentPaymentTitles(payments), [payments])

  const totals = useMemo(() => sumPaymentsByStatus(payments), [payments])
  const outstanding = totals.pending + totals.mayCome
  const totalAll = totals.paid + outstanding

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return payments.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false
      if (categoryFilter === 'none') {
        if (p.category_id) return false
      } else if (categoryFilter !== 'all' && p.category_id !== categoryFilter) {
        return false
      }
      if (q) {
        const hay = `${p.title} ${p.notes ?? ''} ${p.category_id ? categoryMap[p.category_id] ?? '' : ''}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [payments, statusFilter, categoryFilter, search, categoryMap])

  const statusCounts = useMemo(() => {
    const base =
      categoryFilter === 'all'
        ? payments
        : categoryFilter === 'none'
          ? payments.filter((p) => !p.category_id)
          : payments.filter((p) => p.category_id === categoryFilter)
    return {
      all: base.length,
      done: base.filter((p) => p.status === 'done').length,
      pending: base.filter((p) => p.status === 'pending').length,
      may_come: base.filter((p) => p.status === 'may_come').length,
    }
  }, [payments, categoryFilter])

  const filtersActive =
    statusFilter !== 'all' || categoryFilter !== 'all' || search.trim().length > 0

  const grouped = useMemo(() => {
    const sorted = sortPayments(filtered, sortKey)

    if (groupBy === 'none') {
      return sorted.length ? [{ label: 'All expenses', items: sorted }] : []
    }

    const order: string[] = []
    const map = new Map<string, BudgetPayment[]>()

    for (const p of sorted) {
      const key =
        groupBy === 'category'
          ? p.category_id
            ? categoryMap[p.category_id] ?? 'Unknown'
            : 'Uncategorized'
          : monthKey(p.due_date, p.created_at)
      if (!map.has(key)) {
        map.set(key, [])
        order.push(key)
      }
      map.get(key)!.push(p)
    }

    if (groupBy === 'category') {
      order.sort((a, b) => {
        if (a === 'Uncategorized') return 1
        if (b === 'Uncategorized') return -1
        return a.localeCompare(b)
      })
    }

    return order.map((label) => ({ label, items: map.get(label)! }))
  }, [filtered, sortKey, groupBy, categoryMap])

  const clearFilters = () => {
    setStatusFilter('all')
    setCategoryFilter('all')
    setSearch('')
  }

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['budget'] })
    qc.invalidateQueries({ queryKey: ['budget-payments'] })
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const payment = payments.find((p) => p.id === id)
      const { error } = await supabase.from('budget_payments').delete().eq('id', id)
      if (error) throw error
      if (payment?.image_urls?.length) await deletePaymentImages(payment.image_urls)
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

  const savePayment = async (
    values: BudgetPaymentInput,
    image: PaymentImageChange,
    id?: string,
  ) => {
    const prev = id ? payments.find((p) => p.id === id) : null
    const categoryId = values.category_id || null
    const prevUrls = prev?.image_urls ?? []
    const removedUrls = prevUrls.filter((url) => !image.keptUrls.includes(url))

    let uploadedUrls: string[] = []
    if (image.files.length) {
      uploadedUrls = await uploadPaymentImages(image.files)
    }
    const imageUrls = [...image.keptUrls, ...uploadedUrls]

    const payload = {
      title: values.title,
      amount: Number(values.amount),
      status: values.status,
      category_id: categoryId,
      due_date: values.due_date || null,
      notes: values.notes || null,
      made_by: values.made_by || null,
      payment_source: values.payment_source || null,
      image_urls: imageUrls,
      wedding_id: WEDDING_ID,
    }
    const { error } = id
      ? await supabase.from('budget_payments').update(payload).eq('id', id)
      : await supabase.from('budget_payments').insert(payload)
    if (error) {
      // Don't orphan newly uploaded images if the row write fails
      if (uploadedUrls.length) await deletePaymentImages(uploadedUrls)
      throw new Error(error.message)
    }

    if (removedUrls.length) await deletePaymentImages(removedUrls)

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
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setTimelineOpen(true)}>
              <History className="mr-1 h-4 w-4" /> Timeline
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        }
      />

      {/* Compact balance summary */}
      <div className="overflow-hidden rounded-lg border border-gold/30 bg-white/[0.03]">
        <div className="flex items-end justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-white/45">Outstanding</p>
            <p
              className={cn(
                'font-display text-xl font-semibold tabular-nums leading-tight',
                outstanding > 0 ? 'text-amber-300' : 'text-emerald-400',
              )}
            >
              {formatCurrencyCompact(outstanding)}
            </p>
          </div>
          <div className="flex shrink-0 gap-3 text-right">
            <div>
              <p className="text-[9px] uppercase tracking-wide text-white/40">Paid</p>
              <p className="font-display text-xs font-semibold tabular-nums text-emerald-400">
                {formatCurrencyCompact(totals.paid)}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-white/40">Pending</p>
              <p className="font-display text-xs font-semibold tabular-nums text-amber-300">
                {formatCurrencyCompact(totals.pending)}
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wide text-white/40">May come</p>
              <p className="font-display text-xs font-semibold tabular-nums text-white/65">
                {formatCurrencyCompact(totals.mayCome)}
              </p>
            </div>
          </div>
        </div>
        {totalAll > 0 && (
          <div className="h-1 overflow-hidden bg-white/5">
            <div
              className="h-full bg-emerald-500/70 transition-all"
              style={{ width: `${Math.min(100, (totals.paid / totalAll) * 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* Status + tools — compact filter fonts only */}
      <div className="space-y-1.5">
        <div className="flex gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {FILTERS.map((f) => {
            const active = statusFilter === f.value
            const count = statusCounts[f.value]
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
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

        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-white/40" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="h-8 border-gold/25 bg-white/[0.03] pl-7 pr-7 text-[11px]"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/45 hover:text-gold"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 min-w-0 flex-1 gap-1 px-1.5 text-[11px]" aria-label="Filter by category">
              <SelectValue placeholder="Category">
                {categoryFilter === 'all'
                  ? 'Category'
                  : categoryFilter === 'none'
                    ? 'None'
                    : categoryMap[categoryFilter] ?? 'Category'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
              <SelectItem value="none">Uncategorized</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 min-w-0 flex-1 gap-1 px-1.5 text-[11px]" aria-label="Sort expenses">
              <ArrowUpDown className="h-3 w-3 shrink-0 opacity-60" />
              <SelectValue placeholder="Sort">
                {SORT_OPTIONS.find((o) => o.value === sortKey)?.short ?? 'Sort'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="h-8 min-w-0 flex-1 gap-1 px-1.5 text-[11px]" aria-label="Group expenses">
              <Layers className="h-3 w-3 shrink-0 opacity-60" />
              <SelectValue placeholder="Group">
                {GROUP_OPTIONS.find((o) => o.value === groupBy)?.short ?? 'Group'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GROUP_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 shrink-0 px-2 text-[11px]"
              onClick={clearFilters}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading && <p className="py-10 text-center text-sm text-white/50">Loading…</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="py-14 text-center">
          <p className="text-sm text-white/55">
            {payments.length === 0 ? 'No payments here yet.' : 'No payments match these filters.'}
          </p>
          {payments.length === 0 ? (
            <Button size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add payment
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* Expense list */}
      <div className="space-y-4">
        {grouped.map((group) => (
          <section key={group.label}>
            {groupBy !== 'none' && (
              <h2 className="sticky top-0 z-[1] -mx-1 mb-0.5 bg-[#0d0718]/90 px-1 py-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-white/40 backdrop-blur-sm">
                {group.label}
                <span className="ml-1.5 tabular-nums text-white/25">{group.items.length}</span>
              </h2>
            )}
            <div className="divide-y divide-white/[0.06]">
              {group.items.map((p) => (
                <ExpenseRow
                  key={p.id}
                  payment={p}
                  categoryName={p.category_id ? categoryMap[p.category_id] : undefined}
                  madeByLabel={p.made_by ? makerMap[p.made_by] ?? p.made_by : undefined}
                  sourceLabel={
                    p.payment_source ? sourceMap[p.payment_source] ?? p.payment_source : undefined
                  }
                  onOpen={() => setEditPay(p)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      <PaymentDrawerShell
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setFormSubmitting(false)
        }}
        title="Add an expense"
        footer={
          <Button
            type="submit"
            form="payment-form-create"
            className="h-9 w-full text-sm"
            disabled={formSubmitting}
          >
            {formSubmitting ? 'Saving…' : 'Save'}
          </Button>
        }
      >
        <PaymentForm
          key={createOpen ? 'create-open' : 'create-closed'}
          formId="payment-form-create"
          categories={categories}
          makers={makers}
          sources={sources}
          titleSuggestions={titleSuggestions}
          onManageMakers={() => setMakersOpen(true)}
          onManageSources={() => setSourcesOpen(true)}
          onSubmittingChange={setFormSubmitting}
          onSubmit={async (v, image) => {
            try {
              await savePayment(v, image)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to save')
              throw e
            }
          }}
        />
      </PaymentDrawerShell>

      <PaymentDrawerShell
        open={!!editPay}
        onOpenChange={(open) => {
          if (!open) {
            setEditPay(null)
            setFormSubmitting(false)
          }
        }}
        title="Edit expense"
        footer={
          editPay ? (
            <div className="flex w-full gap-2">
              <Button
                type="submit"
                form="payment-form-edit"
                className="h-9 flex-1 text-sm"
                disabled={formSubmitting}
              >
                {formSubmitting ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(editPay.id)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      >
        {editPay && (
          <PaymentForm
            key={editPay.id}
            formId="payment-form-edit"
            categories={categories}
            makers={makers}
            sources={sources}
            titleSuggestions={titleSuggestions}
            onManageMakers={() => setMakersOpen(true)}
            onManageSources={() => setSourcesOpen(true)}
            onSubmittingChange={setFormSubmitting}
            existingImageUrls={editPay.image_urls ?? []}
            defaultValues={{
              title: editPay.title,
              amount: Number(editPay.amount),
              status: editPay.status,
              category_id: editPay.category_id ?? '',
              due_date: editPay.due_date ?? '',
              notes: editPay.notes ?? '',
              made_by: editPay.made_by ?? '',
              payment_source: editPay.payment_source ?? '',
            }}
            onSubmit={async (v, image) => {
              try {
                await savePayment(v, image, editPay.id)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to save')
                throw e
              }
            }}
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

      <PaymentTimelineDrawer
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        payments={payments}
        categoryMap={categoryMap}
        makerMap={makerMap}
        sourceMap={sourceMap}
        onOpenPayment={setEditPay}
      />

      <PaymentOptionCatalogDrawer
        kind="makers"
        open={makersOpen}
        onOpenChange={setMakersOpen}
        options={makers}
        usageCounts={makerUsage}
      />

      <PaymentOptionCatalogDrawer
        kind="sources"
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        options={sources}
        usageCounts={sourceUsage}
      />
    </div>
  )
}
