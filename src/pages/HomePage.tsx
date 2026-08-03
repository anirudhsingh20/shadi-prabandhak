import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CalendarDays, Check, ChevronRight, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { Countdown } from '@/components/Countdown'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import { sumPaymentsByStatus } from '@/lib/budget'
import { sumFundsByAvailability } from '@/lib/bankFunds'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { decisionSchema, type DecisionInput } from '@/lib/validations'
import type {
  BankFund,
  BudgetCategory,
  BudgetPayment,
  BudgetPaymentStatus,
  ChecklistItem,
  ChecklistPriority,
  ChecklistStatus,
  Decision,
  Event,
  Guest,
  PaymentMakerType,
  PaymentSourceType,
  Wedding,
} from '@/lib/types'

const PRIORITY_RANK: Record<ChecklistPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
}

const PAYMENT_TONE: Record<BudgetPaymentStatus, { amount: string; dot: string }> = {
  done: {
    amount: 'text-emerald-400',
    dot: 'bg-emerald-400 ring-emerald-400/25',
  },
  pending: {
    amount: 'text-amber-300',
    dot: 'bg-amber-300 ring-amber-300/25',
  },
  may_come: {
    amount: 'text-white/55',
    dot: 'bg-white/45 ring-white/15',
  },
}

function paymentDate(p: BudgetPayment) {
  return p.due_date || p.created_at.slice(0, 10)
}

function formatDecisionDate(value: string) {
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function formatDueLabel(value: string | null | undefined) {
  if (!value) return null
  if (!isIsoDate(value)) return value
  const d = new Date(`${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function dueSortKey(value: string | null | undefined) {
  if (isIsoDate(value)) return value
  return '9999-12-31'
}

function PriorityIcon({
  priority,
  className,
}: {
  priority: ChecklistPriority
  className?: string
}) {
  if (priority === 'low') {
    return (
      <span
        className={cn('inline-flex h-3.5 w-3 items-center justify-center', className)}
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
    )
  }

  const count = priority === 'high' ? 3 : 2
  const color = priority === 'high' ? 'text-red-500' : 'text-amber-400'

  return (
    <span
      className={cn('inline-flex h-3.5 w-3 flex-col items-center justify-center', className)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <ChevronUp
          key={i}
          className={cn('h-2 w-2 stroke-[3]', color, i > 0 && '-mt-[5px]')}
        />
      ))}
    </span>
  )
}

function statusForPriority(priority: ChecklistPriority): ChecklistStatus {
  return priority === 'high' ? 'next' : 'later'
}

function NotionCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        'mt-0.5 flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[3px] border transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60',
        checked
          ? 'border-gold bg-gold text-gold-foreground'
          : 'border-white/35 bg-transparent text-transparent hover:border-gold/55',
        disabled && 'opacity-50',
      )}
    >
      <Check className="h-2.5 w-2.5 stroke-[3]" aria-hidden />
    </button>
  )
}

function SectionNav({
  to,
  title,
  hint,
  action,
}: {
  to?: string
  title: string
  hint?: string
  action?: ReactNode
}) {
  const label = (
    <>
      <span className="min-w-0 truncate">
        {title}
        {hint ? (
          <span className="ml-1.5 font-sans text-[10px] font-normal tracking-normal text-white/40">
            {hint}
          </span>
        ) : null}
      </span>
      {to ? (
        <ChevronRight className="h-4 w-4 shrink-0 text-white/35 transition-colors group-hover:text-gold" />
      ) : null}
    </>
  )

  return (
    <div className="flex items-center gap-2">
      {to ? (
        <Link
          to={to}
          className="group flex min-w-0 flex-1 items-center justify-between gap-2 font-display text-[15px] font-semibold tracking-wide text-gold"
        >
          {label}
        </Link>
      ) : (
        <h2 className="min-w-0 flex-1 font-display text-[15px] font-semibold tracking-wide text-gold">
          {title}
          {hint ? (
            <span className="ml-1.5 font-sans text-[10px] font-normal tracking-normal text-white/40">
              {hint}
            </span>
          ) : null}
        </h2>
      )}
      {action}
    </div>
  )
}

function DecisionDateField({
  value,
  onChange,
  onBlur,
  name,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const label = value ? formatDecisionDate(value) : null

  const openPicker = () => {
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.click()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="date"
        name={name}
        value={value || ''}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          'inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors',
          value
            ? 'border-gold/40 bg-gold/10 text-gold'
            : 'border-gold/20 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]',
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label ?? 'Pick date'}</span>
      </button>
    </div>
  )
}

function DecisionForm({
  formId,
  onSubmit,
  onSubmittingChange,
}: {
  formId: string
  onSubmit: (values: DecisionInput) => Promise<void>
  onSubmittingChange?: (submitting: boolean) => void
}) {
  const form = useForm<DecisionInput>({
    resolver: zodResolver(decisionSchema),
    defaultValues: { decision_date: new Date().toISOString().slice(0, 10), text: '' },
  })

  useEffect(() => {
    onSubmittingChange?.(form.formState.isSubmitting)
  }, [form.formState.isSubmitting, onSubmittingChange])

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values)
        })}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Note
              </p>
              <FormControl>
                <Textarea
                  autoFocus
                  rows={4}
                  placeholder="What did you decide?"
                  className="min-h-[96px] resize-none border-0 border-b border-gold/30 bg-transparent px-0 py-1.5 text-base shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="decision_date"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Date
              </p>
              <FormControl>
                <DecisionDateField
                  name={field.name}
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

export function HomePage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [showAllDecisions, setShowAllDecisions] = useState(false)

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('decision_date', { ascending: false })
      if (error) throw error
      return data as Decision[]
    },
  })

  const { data: checklistItems = [], isLoading: checklistLoading } = useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as ChecklistItem[]
    },
  })

  const { data: guests = [], isLoading: guestsLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
      if (error) throw error
      return data as Guest[]
    },
  })

  const guestStats = useMemo(() => {
    const headcount = (list: Guest[]) =>
      list.reduce((sum, g) => sum + Math.max(1, Number(g.headcount) || 1), 0)
    const bride = guests.filter((g) => g.side === 'bride')
    const groom = guests.filter((g) => g.side === 'groom')
    const common = guests.filter((g) => g.side === 'common')
    return {
      total: headcount(guests),
      entries: guests.length,
      bride: headcount(bride),
      groom: headcount(groom),
      common: headcount(common),
    }
  }, [guests])

  const topChecklist = useMemo(() => {
    return checklistItems
      .filter((item) => item.status !== 'done')
      .sort((a, b) => {
        const priorityDiff =
          PRIORITY_RANK[a.priority ?? 'low'] - PRIORITY_RANK[b.priority ?? 'low']
        if (priorityDiff !== 0) return priorityDiff
        return dueSortKey(a.due_label).localeCompare(dueSortKey(b.due_label))
      })
      .slice(0, 3)
  }, [checklistItems])

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
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

  const { data: wedding, isLoading: weddingLoading } = useQuery({
    queryKey: ['wedding'],
    queryFn: async () => {
      const { data, error } = await supabase.from('weddings').select('*').eq('id', WEDDING_ID).single()
      if (error) throw error
      return data as Wedding
    },
  })

  const { data: bankFunds = [], isLoading: bankFundsLoading } = useQuery({
    queryKey: ['bank-funds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_funds')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return data as BankFund[]
    },
  })

  const budgetLoading = weddingLoading || paymentsLoading || bankFundsLoading

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

  const recentPayments = useMemo(() => {
    return payments
      .filter((p) => p.status === 'done')
      .sort((a, b) => {
        const da = paymentDate(a)
        const db = paymentDate(b)
        if (da !== db) return db.localeCompare(da)
        return b.created_at.localeCompare(a.created_at)
      })
      .slice(0, 3)
  }, [payments])

  const budgetInsight = useMemo(() => {
    const totalBudget = Number(wedding?.total_budget) || 0
    const paymentTotals = sumPaymentsByStatus(payments)
    const fundTotals = sumFundsByAvailability(bankFunds)
    const budgetLeft = totalBudget - paymentTotals.paid
    const usedPct =
      totalBudget > 0 ? Math.min(100, (paymentTotals.paid / totalBudget) * 100) : 0
    return {
      inBankNow: fundTotals.now,
      budgetLeft,
      totalBudget,
      usedPct,
      ...paymentTotals,
      scheduledInBank: fundTotals.scheduled,
    }
  }, [wedding, payments, bankFunds])

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as Event[]
    },
  })

  const homeEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.event_date !== b.event_date) return a.event_date.localeCompare(b.event_date)
      return a.sort_order - b.sort_order
    })
  }, [events])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('decisions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['decisions'] })
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const toggleChecklistMutation = useMutation({
    mutationFn: async (item: ChecklistItem) => {
      const priority = item.priority ?? 'low'
      const status: ChecklistStatus =
        item.status === 'done' ? statusForPriority(priority) : 'done'
      const { error } = await supabase
        .from('checklist_items')
        .update({ status })
        .eq('id', item.id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['checklist'] })
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-2.5">
      <section>
        <p className="text-[11px] text-white/70">Anjali & Anirudh · 20 Nov 2026</p>
        <div className="mt-0.5">
          <Countdown />
        </div>
      </section>

      <section>
        <SectionNav to="/guests" title="Guests" />
        {guestsLoading ? (
          <p className="py-0.5 text-[12px] text-white/45">Loading…</p>
        ) : (
          <Link
            to="/guests"
            className="mt-0.5 flex items-baseline gap-2 rounded-md py-0.5 hover:bg-white/[0.04]"
          >
            <span className="font-display text-base font-semibold tabular-nums text-white/90">
              {guestStats.total}
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] text-white/40">
              Bride {guestStats.bride} · Groom {guestStats.groom}
              {guestStats.common > 0 ? ` · Common ${guestStats.common}` : ''}
            </span>
            <span className="shrink-0 text-[10px] tabular-nums text-white/30">
              {guestStats.entries}
            </span>
          </Link>
        )}
      </section>

      <section>
        <SectionNav to="/checklist" title="Checklist" hint="Top 3" />
        {checklistLoading ? (
          <p className="py-0.5 text-[12px] text-white/45">Loading…</p>
        ) : topChecklist.length === 0 ? (
          <p className="py-0.5 text-[12px] text-white/45">No open tasks.</p>
        ) : (
          <ul>
            {topChecklist.map((item) => {
              const priority = item.priority ?? 'low'
              const due = formatDueLabel(item.due_label)
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-1.5 rounded-md py-0.5 hover:bg-white/[0.04]"
                >
                  <NotionCheckbox
                    checked={false}
                    disabled={toggleChecklistMutation.isPending}
                    onChange={() => toggleChecklistMutation.mutate(item)}
                  />
                  {priority !== 'low' ? (
                    <PriorityIcon priority={priority} className="mt-0.5 shrink-0" />
                  ) : (
                    <span className="mt-0.5 h-3.5 w-3 shrink-0" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-[12px] leading-snug',
                        priority === 'high'
                          ? 'font-semibold text-white'
                          : priority === 'low'
                            ? 'text-white/70'
                            : 'text-white/90',
                      )}
                    >
                      {item.title}
                      {due ? (
                        <span className="ml-1.5 text-[10px] font-normal tabular-nums text-white/35">
                          {due}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <SectionNav to="/budget" title="Budget" hint="Overview" />
        {budgetLoading ? (
          <p className="py-0.5 text-[12px] text-white/45">Loading…</p>
        ) : (
          <Link
            to="/budget"
            className="mt-0.5 block overflow-hidden rounded-md border border-gold/25 bg-white/[0.03] transition-colors hover:border-gold/40 hover:bg-white/[0.05]"
          >
            <div className="grid grid-cols-2 gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-white/45">In bank now</p>
                <p className="font-display text-base font-semibold tabular-nums text-emerald-400">
                  {formatCurrencyCompact(budgetInsight.inBankNow)}
                </p>
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-white/45">Budget left</p>
                <p className="font-display text-base font-semibold tabular-nums text-gold">
                  {formatCurrencyCompact(budgetInsight.budgetLeft)}
                </p>
              </div>
            </div>
            <div className="border-t border-gold/15 px-3 py-2">
              <p className="truncate text-[11px] text-white/45">
                Paid {formatCurrencyCompact(budgetInsight.paid)} · Pending{' '}
                {formatCurrencyCompact(budgetInsight.pending)}
                {budgetInsight.scheduledInBank > 0
                  ? ` · Scheduled ${formatCurrencyCompact(budgetInsight.scheduledInBank)}`
                  : ''}
              </p>
              {budgetInsight.totalBudget > 0 ? (
                <div className="mt-1.5">
                  <Progress value={budgetInsight.usedPct} className="h-1" />
                </div>
              ) : null}
            </div>
          </Link>
        )}
      </section>

      <section>
        <SectionNav
          title="Decisions"
          action={
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 shrink-0 p-0 text-white/55 hover:text-gold"
              aria-label="Add decision"
              onClick={() => setDrawerOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          }
        />

        {isLoading ? (
          <p className="py-0.5 text-[12px] text-white/45">Loading…</p>
        ) : decisions.length === 0 ? (
          <p className="py-0.5 text-[12px] text-white/45">No decisions yet.</p>
        ) : (
          <>
            <div className="relative mt-0.5 pl-3.5">
              <div
                className="absolute bottom-1 left-[4px] top-1 w-px bg-gold/20"
                aria-hidden
              />
              <ul>
                {(showAllDecisions ? decisions : decisions.slice(0, 3)).map((d, index, list) => (
                  <li key={d.id} className="relative">
                    <span
                      className="absolute -left-3.5 top-2 h-2 w-2 rounded-full bg-gold/70 ring-4 ring-gold/15"
                      aria-hidden
                    />
                    <div
                      className={cn(
                        'flex items-start gap-1 rounded-md py-1 pl-1 pr-0.5',
                        index < list.length - 1 && 'border-b border-white/[0.04]',
                      )}
                    >
                      <span className="w-9 shrink-0 pt-px text-[10px] font-medium tabular-nums leading-snug text-white/40">
                        {formatDecisionDate(d.decision_date)}
                      </span>
                      <p className="min-w-0 flex-1 text-[12px] leading-snug text-white/85">
                        {d.text}
                      </p>
                      <button
                        type="button"
                        aria-label="Delete decision"
                        className="mt-px shrink-0 rounded p-0.5 text-white/30 hover:text-white/70"
                        onClick={() => setDeleteId(d.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            {decisions.length > 3 ? (
              <button
                type="button"
                onClick={() => setShowAllDecisions((v) => !v)}
                className="mt-0.5 text-[11px] font-medium text-gold/75 hover:text-gold"
              >
                {showAllDecisions
                  ? 'Show less'
                  : `+${decisions.length - 3} more`}
              </button>
            ) : null}
          </>
        )}
      </section>

      <section>
        <SectionNav to="/payments" title="Payments" hint="Paid" />
        {paymentsLoading ? (
          <p className="py-0.5 text-[12px] text-white/45">Loading…</p>
        ) : recentPayments.length === 0 ? (
          <p className="py-0.5 text-[12px] text-white/45">No paid payments yet.</p>
        ) : (
          <div className="relative mt-0.5 pl-3.5">
            <div
              className="absolute bottom-1 left-[4px] top-1 w-px bg-gold/20"
              aria-hidden
            />
            <ul>
              {recentPayments.map((payment, index) => {
                const tone = PAYMENT_TONE[payment.status]
                const date = formatDecisionDate(paymentDate(payment))
                const categoryName = payment.category_id
                  ? categoryMap[payment.category_id]
                  : undefined
                const madeBy = payment.made_by
                  ? makerMap[payment.made_by] ?? payment.made_by
                  : undefined
                const source = payment.payment_source
                  ? sourceMap[payment.payment_source] ?? payment.payment_source
                  : undefined
                const meta = [categoryName, madeBy, source].filter(Boolean).join(' · ')

                return (
                  <li key={payment.id} className="relative">
                    <span
                      className={cn(
                        'absolute -left-3.5 top-2 h-2 w-2 rounded-full ring-4',
                        tone.dot,
                      )}
                      aria-hidden
                    />
                    <Link
                      to="/payments"
                      className={cn(
                        'flex items-start gap-1 rounded-md py-1 pl-1 pr-0.5 hover:bg-white/[0.04]',
                        index < recentPayments.length - 1 && 'border-b border-white/[0.04]',
                      )}
                    >
                      <span className="w-9 shrink-0 pt-px text-[10px] font-medium tabular-nums leading-snug text-white/40">
                        {date}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[12px] leading-snug text-white/90">
                          {payment.title}
                        </p>
                        {meta ? (
                          <p className="truncate text-[10px] leading-tight text-white/35">
                            {meta}
                          </p>
                        ) : null}
                      </div>
                      <span
                        className={cn(
                          'shrink-0 font-display text-[12px] font-semibold tabular-nums leading-snug',
                          tone.amount,
                        )}
                      >
                        {formatCurrency(Number(payment.amount))}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      <section>
        <SectionNav to="/events" title="Events" />
        {eventsLoading ? (
          <p className="py-0.5 text-[12px] text-white/45">Loading…</p>
        ) : homeEvents.length === 0 ? (
          <p className="py-0.5 text-[12px] text-white/45">No events yet.</p>
        ) : (
          <div className="-mx-4 mt-1 overflow-x-auto overscroll-x-contain px-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <ul className="flex w-max gap-2 pb-0.5">
              {homeEvents.map((event) => {
                const meta = [event.time_label, event.tag].filter(Boolean).join(' · ')
                return (
                  <li key={event.id} className="w-[132px] shrink-0">
                    <Link
                      to="/events"
                      className="flex h-full flex-col rounded-md border border-gold/25 bg-white/[0.03] px-2.5 py-2 transition-colors hover:border-gold/40 hover:bg-white/[0.05]"
                    >
                      <span className="text-[10px] font-medium tabular-nums text-white/40">
                        {formatDecisionDate(event.event_date)}
                      </span>
                      <p className="mt-0.5 line-clamp-2 text-[12px] font-medium leading-snug text-white/90">
                        {event.name}
                      </p>
                      {meta ? (
                        <p className="mt-auto pt-1 truncate text-[10px] leading-tight text-white/35">
                          {meta}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </section>

      <Drawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open)
          if (!open) setFormSubmitting(false)
        }}
        dismissible={false}
        shouldScaleBackground={false}
        repositionInputs={false}
        fixed
      >
        <DrawerContent className="max-h-[min(88dvh,640px)] overflow-hidden">
          <DrawerHeader className="relative shrink-0 pr-10 text-left">
            <DrawerTitle>Add decision</DrawerTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1 h-9 w-9 text-white/70 hover:text-gold"
              aria-label="Close"
              onClick={() => setDrawerOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-2 [touch-action:pan-y]">
            <DecisionForm
              key={drawerOpen ? 'open' : 'closed'}
              formId="decision-form"
              onSubmittingChange={setFormSubmitting}
              onSubmit={async (values) => {
                const { error } = await supabase.from('decisions').insert({
                  wedding_id: WEDDING_ID,
                  decision_date: values.decision_date,
                  text: values.text,
                })
                if (error) {
                  toast.error(error.message)
                  throw error
                }
                toast.success('Decision added')
                qc.invalidateQueries({ queryKey: ['decisions'] })
                setDrawerOpen(false)
              }}
            />
          </div>
          <DrawerFooter className="shrink-0 border-t border-gold/20">
            <Button
              type="submit"
              form="decision-form"
              className="h-9 w-full text-sm"
              disabled={formSubmitting}
            >
              {formSubmitting ? 'Saving…' : 'Add decision'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete decision?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
