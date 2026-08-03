import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react'
import { BudgetCharts } from '@/components/BudgetCharts'
import {
  BudgetDrawerShell,
  BudgetPaymentRow,
  CategoryForm,
  StatCell,
} from '@/components/budget/shared'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { sumPaymentsByCategory, sumPaymentsByStatus } from '@/lib/budget'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { BudgetCategoryInput } from '@/lib/validations'
import type { BudgetCategory, BudgetPayment, BudgetPaymentStatus, Wedding } from '@/lib/types'

type BudgetSubTab = 'categories' | 'payments' | 'charts'

function sortPayments(list: BudgetPayment[]) {
  return [...list].sort((a, b) => {
    const dueA = a.due_date ?? ''
    const dueB = b.due_date ?? ''
    if (dueA && dueB && dueA !== dueB) return dueA.localeCompare(dueB)
    if (dueA && !dueB) return -1
    if (!dueA && dueB) return 1
    return b.created_at.localeCompare(a.created_at)
  })
}

export function BudgetTabContent({
  wedding,
  categories,
  payments,
  isLoading,
  onOpenTotalBudget,
}: {
  wedding: Wedding | undefined
  categories: BudgetCategory[]
  payments: BudgetPayment[]
  isLoading: boolean
  onOpenTotalBudget: () => void
}) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<BudgetSubTab>('categories')
  const [catCreateOpen, setCatCreateOpen] = useState(false)
  const [editCat, setEditCat] = useState<BudgetCategory | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<'all' | BudgetPaymentStatus>('all')

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c.name])),
    [categories],
  )

  const paymentTotals = useMemo(() => sumPaymentsByStatus(payments), [payments])
  const byCategory = useMemo(() => sumPaymentsByCategory(payments), [payments])

  const totals = useMemo(() => {
    const totalBudget = Number(wedding?.total_budget) || 0
    const allocated = categories.reduce((s, c) => s + Number(c.allocated), 0)
    return {
      totalBudget,
      allocated,
      unallocated: totalBudget - allocated,
      ...paymentTotals,
      remainingBudget: totalBudget - paymentTotals.paid,
      paymentCount: payments.length,
      categoryCount: categories.length,
    }
  }, [wedding, categories, paymentTotals, payments.length])

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
        paid: byCategory[c.id]?.paid ?? 0,
      })),
    [categories, byCategory],
  )

  const paymentsByCatId = useMemo(() => {
    const map: Record<string, BudgetPayment[]> = {}
    for (const p of payments) {
      const key = p.category_id ?? '__none__'
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    for (const key of Object.keys(map)) {
      map[key] = sortPayments(map[key])
    }
    return map
  }, [payments])

  const filteredPayments = useMemo(() => {
    const list = statusFilter === 'all' ? payments : payments.filter((p) => p.status === statusFilter)
    return sortPayments(list)
  }, [payments, statusFilter])

  const uncategorized = byCategory.__none__
  const statusCounts = useMemo(
    () => ({
      all: payments.length,
      done: payments.filter((p) => p.status === 'done').length,
      pending: payments.filter((p) => p.status === 'pending').length,
      may_come: payments.filter((p) => p.status === 'may_come').length,
    }),
    [payments],
  )

  const deleteCatMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Category deleted')
      qc.invalidateQueries({ queryKey: ['budget'] })
      setDeleteCatId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveCategory = async (values: BudgetCategoryInput, id?: string) => {
    const payload = {
      name: values.name,
      description: values.description?.trim() || null,
      allocated: Number(values.allocated),
      sort_order: Number(values.sort_order) || 0,
      wedding_id: WEDDING_ID,
    }
    const { error } = id
      ? await supabase.from('budget_categories').update(payload).eq('id', id)
      : await supabase.from('budget_categories').insert({ ...payload, spent: 0 })
    if (error) throw new Error(error.message)
    toast.success(id ? 'Category updated' : 'Category added')
    qc.invalidateQueries({ queryKey: ['budget'] })
    setCatCreateOpen(false)
    setEditCat(null)
  }

  const overallPct =
    totals.totalBudget > 0 ? Math.min(100, (totals.paid / totals.totalBudget) * 100) : 0

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-gold/40">
        <button
          type="button"
          onClick={onOpenTotalBudget}
          className="w-full border-b border-gold/30 px-3 py-2.5 text-left transition-colors hover:bg-gold/10"
        >
          <p className="text-[10px] uppercase tracking-wide text-white/55">Total budget</p>
          <p className="flex items-center gap-1.5 font-display text-xl font-semibold text-gold">
            <span className="min-w-0 truncate">{formatCurrency(totals.totalBudget)}</span>
            <Pencil className="h-3.5 w-3.5 shrink-0 text-gold/70" aria-hidden />
          </p>
          <p className="text-[11px] text-white/50">
            {formatCurrency(totals.remainingBudget)} left after paid
          </p>
        </button>
        <div className="border-b border-gold/25 px-3 py-2">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-white/55">
            <span>Budget used</span>
            <span className="tabular-nums text-white/70">{Math.round(overallPct)}%</span>
          </div>
          <Progress value={overallPct} className="h-1.5" />
        </div>
        <div className="grid grid-cols-4 gap-1.5 px-2 py-2">
          <StatCell
            label="Paid"
            value={formatCurrencyCompact(totals.paid)}
            title={formatCurrency(totals.paid)}
            emphasize
          />
          <StatCell
            label="Pending"
            value={formatCurrencyCompact(totals.pending)}
            title={formatCurrency(totals.pending)}
          />
          <StatCell
            label="May come"
            value={formatCurrencyCompact(totals.mayCome)}
            title={formatCurrency(totals.mayCome)}
          />
          <StatCell
            label="Allocated"
            value={formatCurrencyCompact(totals.allocated)}
            title={formatCurrency(totals.allocated)}
          />
          <StatCell
            label="Unallocated"
            value={formatCurrencyCompact(totals.unallocated)}
            title={formatCurrency(totals.unallocated)}
          />
          <StatCell
            label="Payments"
            value={`${totals.paymentCount}`}
            onClick={() => setTab('payments')}
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as BudgetSubTab)}>
        <TabsList className="grid h-auto w-full grid-cols-3 p-0.5">
          <TabsTrigger value="categories" className="flex flex-row items-center gap-1 px-2 py-1 text-xs">
            <span>Categories</span>
            <span className="font-display text-xs font-semibold">{totals.categoryCount}</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="flex flex-row items-center gap-1 px-2 py-1 text-xs">
            <span>Payments</span>
            <span className="font-display text-xs font-semibold">{totals.paymentCount}</span>
          </TabsTrigger>
          <TabsTrigger value="charts" className="px-2 py-1 text-xs">
            Charts
          </TabsTrigger>
        </TabsList>

        {isLoading && <p className="py-6 text-center text-sm text-white/60">Loading…</p>}

        {!isLoading && (
          <>
            <TabsContent value="categories" className="mt-3 space-y-2">
              <div className="flex justify-end">
                <Button size="sm" onClick={() => setCatCreateOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" /> Category
                </Button>
              </div>
              {categories.length === 0 && (
                <p className="py-8 text-center text-sm text-white/60">No categories yet.</p>
              )}
              {categories.map((c) => {
                const rollup = byCategory[c.id]
                const paid = rollup?.paid ?? 0
                const pending = rollup?.pending ?? 0
                const mayCome = rollup?.mayCome ?? 0
                const allocated = Number(c.allocated)
                const remaining = allocated - paid
                const pct = allocated > 0 ? Math.min(100, (paid / allocated) * 100) : 0
                const over = paid > allocated && allocated > 0
                const open = expandedCat === c.id
                const catPayments = paymentsByCatId[c.id] ?? []

                return (
                  <div key={c.id} className="overflow-hidden rounded-md border border-gold/35">
                    <div className="flex items-start gap-1 px-2.5 py-2">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => setExpandedCat(open ? null : c.id)}
                      >
                        <div className="flex items-center gap-1.5">
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 text-white/45 transition-transform',
                              open && 'rotate-180',
                            )}
                          />
                          <p className="truncate text-sm font-semibold text-white">{c.name}</p>
                          <span className="shrink-0 text-[10px] tabular-nums text-white/40">
                            {rollup?.count ?? 0} pay
                          </span>
                        </div>
                        {c.description ? (
                          <p className="mt-0.5 pl-5 text-[11px] leading-snug text-white/45">
                            {c.description}
                          </p>
                        ) : null}
                        <div className="mt-1 grid grid-cols-3 gap-1 pl-5 text-[11px]">
                          <div>
                            <p className="text-white/45">Paid</p>
                            <p className="font-medium tabular-nums text-gold">{formatCurrency(paid)}</p>
                          </div>
                          <div>
                            <p className="text-white/45">Allocated</p>
                            <p className="font-medium tabular-nums text-white">
                              {formatCurrency(allocated)}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/45">{over ? 'Over' : 'Left'}</p>
                            <p
                              className={cn(
                                'font-medium tabular-nums',
                                over ? 'text-amber-300' : 'text-white',
                              )}
                            >
                              {formatCurrency(Math.abs(remaining))}
                            </p>
                          </div>
                        </div>
                        {(pending > 0 || mayCome > 0) && (
                          <p className="mt-1 pl-5 text-[11px] text-white/50">
                            {pending > 0 && `Pending ${formatCurrency(pending)}`}
                            {pending > 0 && mayCome > 0 && ' · '}
                            {mayCome > 0 && `May come ${formatCurrency(mayCome)}`}
                          </p>
                        )}
                        <div className="mt-2 pl-5">
                          <Progress value={pct} className="h-1.5" />
                        </div>
                      </button>
                      <div className="flex shrink-0 gap-0.5 pt-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditCat(c)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteCatId(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    {open && (
                      <div className="border-t border-gold/25 bg-black/20">
                        {catPayments.length === 0 ? (
                          <p className="px-3 py-3 text-center text-xs text-white/50">
                            No payments in this category.{' '}
                            <Link
                              to="/payments"
                              className="text-gold underline-offset-2 hover:underline"
                            >
                              Add on Payments
                            </Link>
                          </p>
                        ) : (
                          catPayments.map((p) => (
                            <BudgetPaymentRow key={p.id} payment={p} showCategory={false} />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {uncategorized && uncategorized.count > 0 && (
                <div className="overflow-hidden rounded-md border border-dashed border-gold/30">
                  <button
                    type="button"
                    className="w-full px-2.5 py-2 text-left"
                    onClick={() =>
                      setExpandedCat(expandedCat === '__none__' ? null : '__none__')
                    }
                  >
                    <div className="flex items-center gap-1.5">
                      <ChevronDown
                        className={cn(
                          'h-3.5 w-3.5 text-white/45 transition-transform',
                          expandedCat === '__none__' && 'rotate-180',
                        )}
                      />
                      <p className="text-sm font-semibold text-white/80">Uncategorized</p>
                      <span className="text-[10px] text-white/40">{uncategorized.count} pay</span>
                    </div>
                    <p className="mt-1 pl-5 text-[11px] text-white/50">
                      Paid {formatCurrency(uncategorized.paid)}
                      {uncategorized.pending > 0 &&
                        ` · Pending ${formatCurrency(uncategorized.pending)}`}
                      {uncategorized.mayCome > 0 &&
                        ` · May come ${formatCurrency(uncategorized.mayCome)}`}
                    </p>
                  </button>
                  {expandedCat === '__none__' && (
                    <div className="border-t border-gold/25 bg-black/20">
                      {(paymentsByCatId.__none__ ?? []).map((p) => (
                        <BudgetPaymentRow key={p.id} payment={p} showCategory={false} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="payments" className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-white/55">
                  Manage on{' '}
                  <Link to="/payments" className="text-gold underline-offset-2 hover:underline">
                    Payments
                  </Link>
                </p>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
                >
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All ({statusCounts.all})</SelectItem>
                    <SelectItem value="done">Done ({statusCounts.done})</SelectItem>
                    <SelectItem value="pending">Pending ({statusCounts.pending})</SelectItem>
                    <SelectItem value="may_come">May come ({statusCounts.may_come})</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredPayments.length === 0 && (
                <p className="py-8 text-center text-sm text-white/60">No payments in this filter.</p>
              )}

              <div className="overflow-hidden rounded-md border border-gold/35">
                {filteredPayments.map((p) => (
                  <BudgetPaymentRow
                    key={p.id}
                    payment={p}
                    categoryName={p.category_id ? categoryMap[p.category_id] : undefined}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="charts" className="mt-3">
              <BudgetCharts statusData={statusChartData} categoryData={categoryChartData} />
            </TabsContent>
          </>
        )}
      </Tabs>

      <BudgetDrawerShell
        open={catCreateOpen}
        onOpenChange={setCatCreateOpen}
        title="Add category"
      >
        <CategoryForm
          key={catCreateOpen ? 'create-open' : 'create-closed'}
          submitLabel="Add category"
          onSubmit={(v) => saveCategory(v)}
        />
      </BudgetDrawerShell>

      <BudgetDrawerShell
        open={!!editCat}
        onOpenChange={(o) => !o && setEditCat(null)}
        title="Edit category"
      >
        {editCat && (
          <CategoryForm
            key={editCat.id}
            submitLabel="Save changes"
            defaultValues={{
              name: editCat.name,
              description: editCat.description ?? '',
              allocated: Number(editCat.allocated),
              sort_order: editCat.sort_order,
            }}
            onSubmit={(v) => saveCategory(v, editCat.id)}
          />
        )}
      </BudgetDrawerShell>

      <DeleteConfirm
        open={!!deleteCatId}
        onOpenChange={(o) => !o && setDeleteCatId(null)}
        title="Delete category?"
        onConfirm={() => deleteCatId && deleteCatMutation.mutate(deleteCatId)}
        loading={deleteCatMutation.isPending}
      />
    </div>
  )
}
