import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowRight, Pencil, Plus, Trash2, Wallet } from 'lucide-react'
import { BudgetCharts } from '@/components/BudgetCharts'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { sumPaymentsByStatus } from '@/lib/budget'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import {
  budgetCategorySchema,
  moneyInBankSchema,
  totalBudgetSchema,
  type BudgetCategoryInput,
  type MoneyInBankInput,
  type TotalBudgetInput,
} from '@/lib/validations'
import type { BudgetCategory, BudgetPayment, Wedding } from '@/lib/types'

function MoneyForm({
  defaultValue,
  onSubmit,
}: {
  defaultValue: number
  onSubmit: (values: MoneyInBankInput) => Promise<void>
}) {
  const form = useForm<MoneyInBankInput>({
    resolver: zodResolver(moneyInBankSchema),
    defaultValues: { money_in_bank: defaultValue },
  })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="money_in_bank"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Money in bank (₹)</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}

function TotalBudgetForm({
  defaultValue,
  onSubmit,
}: {
  defaultValue: number
  onSubmit: (values: TotalBudgetInput) => Promise<void>
}) {
  const form = useForm<TotalBudgetInput>({
    resolver: zodResolver(totalBudgetSchema),
    defaultValues: { total_budget: defaultValue },
  })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="total_budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total budget (₹)</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Save'}
        </Button>
      </form>
    </Form>
  )
}

function CategoryForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<BudgetCategoryInput>
  onSubmit: (values: BudgetCategoryInput) => Promise<void>
  submitLabel: string
}) {
  const form = useForm<BudgetCategoryInput>({
    resolver: zodResolver(budgetCategorySchema),
    defaultValues: { name: '', allocated: 0, sort_order: 0, ...defaultValues },
  })
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="allocated" render={({ field }) => (
          <FormItem>
            <FormLabel>Allocated (₹)</FormLabel>
            <FormControl><Input type="number" min={0} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Form>
  )
}

export function BudgetPage() {
  const qc = useQueryClient()
  const [bankOpen, setBankOpen] = useState(false)
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [catCreateOpen, setCatCreateOpen] = useState(false)
  const [editCat, setEditCat] = useState<BudgetCategory | null>(null)
  const [deleteCatId, setDeleteCatId] = useState<string | null>(null)

  const { data: wedding } = useQuery({
    queryKey: ['wedding'],
    queryFn: async () => {
      const { data, error } = await supabase.from('weddings').select('*').eq('id', WEDDING_ID).single()
      if (error) throw error
      return data as Wedding
    },
  })

  const { data: categories = [], isLoading: catsLoading } = useQuery({
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

  const { data: payments = [], isLoading: paysLoading } = useQuery({
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

  const paymentTotals = useMemo(() => sumPaymentsByStatus(payments), [payments])

  const totals = useMemo(() => {
    const moneyInBank = Number(wedding?.money_in_bank) || 0
    const totalBudget = Number(wedding?.total_budget) || 0
    const allocated = categories.reduce((s, c) => s + Number(c.allocated), 0)
    return {
      moneyInBank,
      totalBudget,
      allocated,
      unallocated: totalBudget - allocated,
      ...paymentTotals,
      leftInBank: moneyInBank - paymentTotals.paid,
      remainingBudget: totalBudget - paymentTotals.paid,
    }
  }, [wedding, categories, paymentTotals])

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

  const upcoming = useMemo(
    () =>
      payments
        .filter((p) => p.status === 'pending' || p.status === 'may_come')
        .slice(0, 4),
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

  const saveBank = async (values: MoneyInBankInput) => {
    const { error } = await supabase
      .from('weddings')
      .update({ money_in_bank: Number(values.money_in_bank) })
      .eq('id', WEDDING_ID)
    if (error) throw new Error(error.message)
    toast.success('Money in bank updated')
    qc.invalidateQueries({ queryKey: ['wedding'] })
    setBankOpen(false)
  }

  const saveTotalBudget = async (values: TotalBudgetInput) => {
    const { error } = await supabase
      .from('weddings')
      .update({ total_budget: Number(values.total_budget) })
      .eq('id', WEDDING_ID)
    if (error) throw new Error(error.message)
    toast.success('Total budget updated')
    qc.invalidateQueries({ queryKey: ['wedding'] })
    setBudgetOpen(false)
  }

  const saveCategory = async (values: BudgetCategoryInput, id?: string) => {
    const payload = {
      name: values.name,
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

  const isLoading = catsLoading || paysLoading

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget"
        description="Money in bank, categories & overview"
        action={
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setBudgetOpen(true)}>
              Total
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBankOpen(true)}>
              <Wallet className="mr-1 h-4 w-4" /> Bank
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setBudgetOpen(true)}
          className="col-span-2 rounded-xl border border-gold/45 bg-card/80 p-4 text-left shadow backdrop-blur-sm transition-colors hover:bg-gold/10"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm text-white/75">Total budget</p>
              <p className="font-display text-3xl font-semibold text-gold">
                {formatCurrency(totals.totalBudget)}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {formatCurrency(totals.remainingBudget)} left after paid
              </p>
            </div>
            <Pencil className="mt-1 h-4 w-4 shrink-0 text-gold/80" />
          </div>
        </button>
        <Card className="col-span-2 border-gold/45">
          <CardContent className="p-4">
            <p className="text-sm text-white/75">Money in bank</p>
            <p className="font-display text-3xl font-semibold text-gold">
              {formatCurrency(totals.moneyInBank)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-white/75">Paid</p>
            <p className="font-display text-2xl font-semibold text-gold">{formatCurrency(totals.paid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-white/75">Left in bank</p>
            <p className="font-display text-2xl font-semibold text-white">{formatCurrency(totals.leftInBank)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-white/75">Pending</p>
            <p className="font-display text-2xl font-semibold text-white">{formatCurrency(totals.pending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-white/75">May come</p>
            <p className="font-display text-2xl font-semibold text-white">{formatCurrency(totals.mayCome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-white/75">Allocated</p>
            <p className="font-display text-2xl font-semibold text-white">{formatCurrency(totals.allocated)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-white/75">Unallocated</p>
            <p className="font-display text-2xl font-semibold text-white">{formatCurrency(totals.unallocated)}</p>
          </CardContent>
        </Card>
      </div>

      <BudgetCharts statusData={statusChartData} categoryData={categoryChartData} />

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-gold">Tracker snapshot</h2>
          <Button size="sm" variant="outline" asChild>
            <Link to="/tracker">
              Open tracker <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!isLoading && upcoming.length === 0 && (
          <p className="rounded-md border border-gold/30 bg-white/5 p-3 text-sm text-white/70">
            No pending or may-come payments.{' '}
            <Link to="/tracker" className="text-gold underline-offset-4 hover:underline">Manage tracker</Link>
          </p>
        )}
        {upcoming.map((p) => (
          <div key={p.id} className="rounded-md border border-gold/30 bg-white/5 px-3 py-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="text-base font-semibold">{p.title}</p>
              <PaymentStatusBadge status={p.status} />
            </div>
            <p className="mt-0.5 font-display text-lg font-semibold text-gold">
              {formatCurrency(Number(p.amount))}
            </p>
            <p className="text-sm text-white/65">
              {[
                p.category_id ? categoryMap[p.category_id] : null,
                p.due_date ? `Due ${p.due_date}` : null,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-gold">Categories</h2>
          <Dialog open={catCreateOpen} onOpenChange={setCatCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline"><Plus className="mr-1 h-4 w-4" /> Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
              <CategoryForm submitLabel="Add category" onSubmit={(v) => saveCategory(v)} />
            </DialogContent>
          </Dialog>
        </div>
        {categories.map((c) => {
          const paid = totals.paidByCategory[c.id] ?? 0
          const allocated = Number(c.allocated)
          const pct = allocated > 0 ? Math.min(100, (paid / allocated) * 100) : 0
          return (
            <div key={c.id} className="rounded-md border border-gold/30 bg-white/5 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-base font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(paid)} paid / {formatCurrency(allocated)} allocated
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditCat(c)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteCatId(c.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={pct} className="mt-3 h-2" />
            </div>
          )
        })}
      </section>

      <Dialog open={budgetOpen} onOpenChange={setBudgetOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Total budget</DialogTitle></DialogHeader>
          <TotalBudgetForm
            key={wedding?.total_budget ?? 0}
            defaultValue={Number(wedding?.total_budget) || 0}
            onSubmit={saveTotalBudget}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={bankOpen} onOpenChange={setBankOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Money in bank</DialogTitle></DialogHeader>
          <MoneyForm
            key={wedding?.money_in_bank ?? 0}
            defaultValue={Number(wedding?.money_in_bank) || 0}
            onSubmit={saveBank}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editCat} onOpenChange={(o) => !o && setEditCat(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit category</DialogTitle></DialogHeader>
          {editCat && (
            <CategoryForm
              submitLabel="Save changes"
              defaultValues={{
                name: editCat.name,
                allocated: Number(editCat.allocated),
                sort_order: editCat.sort_order,
              }}
              onSubmit={(v) => saveCategory(v, editCat.id)}
            />
          )}
        </DialogContent>
      </Dialog>

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
