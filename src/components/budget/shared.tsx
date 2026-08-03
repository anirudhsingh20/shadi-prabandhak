import { type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatAmountInWords, formatCurrency } from '@/lib/utils'
import {
  budgetCategorySchema,
  totalBudgetSchema,
  type BudgetCategoryInput,
  type TotalBudgetInput,
} from '@/lib/validations'
import type { BudgetPayment, BudgetPaymentStatus } from '@/lib/types'

export const AMOUNT_TONE: Record<BudgetPaymentStatus, string> = {
  done: 'text-emerald-400',
  pending: 'text-amber-300',
  may_come: 'text-white/55',
}

export function formatShortDate(iso: string | null | undefined) {
  if (!iso) return null
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function DatePickerField({
  value,
  onChange,
  onBlur,
  name,
  placeholder = 'Pick date',
  allowClear = false,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
  placeholder?: string
  allowClear?: boolean
}) {
  const label = formatShortDate(value)

  return (
    <div className="relative flex items-center gap-1">
      <div className="relative min-h-11 min-w-0 flex-1">
        <input
          type="date"
          name={name}
          value={value || ''}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          aria-label={value ? `Date, ${label}` : placeholder}
          className="absolute inset-0 z-[1] h-full w-full cursor-pointer border-0 bg-transparent p-0 text-base opacity-0 [color-scheme:dark]"
        />
        <div
          className={cn(
            'pointer-events-none flex h-11 items-center gap-2 rounded-md border border-gold/40 bg-black/25 px-3 text-base transition-colors',
            value ? 'text-white' : 'text-white/55',
          )}
          aria-hidden
        >
          <CalendarDays className="h-4 w-4 shrink-0 text-gold/80" />
          <span className="min-w-0 truncate">{label ?? placeholder}</span>
        </div>
      </div>
      {allowClear && value ? (
        <button
          type="button"
          aria-label="Clear date"
          onClick={() => onChange('')}
          className="relative z-[2] flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gold/25 text-white/45 transition-colors hover:bg-white/[0.04] hover:text-white/70"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

export function CompactDateField({
  value,
  onChange,
  onBlur,
  name,
  placeholder = 'Pick date',
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
  placeholder?: string
}) {
  const label = formatShortDate(value)

  return (
    <div className="flex min-h-9 w-full items-center gap-1 border-b border-gold/30">
      <div className="relative min-h-9 min-w-0 flex-1">
        <input
          type="date"
          name={name}
          value={value || ''}
          onBlur={onBlur}
          onChange={(e) => onChange(e.target.value)}
          aria-label={value ? `Due date, ${label}` : placeholder}
          className="absolute inset-0 z-[1] h-full w-full cursor-pointer border-0 bg-transparent p-0 text-base opacity-0 [color-scheme:dark]"
        />
        <div
          className={cn(
            'pointer-events-none flex min-h-9 items-center gap-1.5 px-0.5 text-base leading-none',
            value ? 'text-white/70' : 'text-white/45',
          )}
          aria-hidden
        >
          {!value ? <CalendarDays className="h-4 w-4 shrink-0 text-gold/75" /> : null}
          <span className="min-w-0 truncate">{label ?? placeholder}</span>
        </div>
      </div>
      {value ? (
        <button
          type="button"
          aria-label="Clear date"
          onClick={() => onChange('')}
          className="relative z-[2] flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-white/40 transition-colors hover:bg-white/[0.04] hover:text-white/70 active:bg-white/[0.06]"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  )
}

export function BudgetDrawerShell({
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
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      dismissible={false}
      shouldScaleBackground={false}
      repositionInputs={false}
      fixed
    >
      <DrawerContent className="max-h-[min(92dvh,820px)] overflow-hidden">
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-gold/20 px-3 py-3">{footer}</div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

export function StatCell({
  label,
  value,
  title,
  emphasize,
  onClick,
}: {
  label: string
  value: string
  title?: string
  emphasize?: boolean
  onClick?: () => void
}) {
  const className = cn(
    'min-w-0 rounded-md border border-gold/30 bg-white/[0.04] px-1.5 py-1.5 text-left',
    onClick && 'transition-colors hover:bg-gold/10',
  )
  const body = (
    <>
      <p className="truncate text-[9px] uppercase tracking-wide text-white/55">{label}</p>
      <p
        className={cn(
          'mt-0.5 truncate font-display text-[13px] font-semibold leading-tight tabular-nums',
          emphasize ? 'text-gold' : 'text-white',
        )}
        title={title ?? value}
      >
        {value}
      </p>
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {body}
      </button>
    )
  }
  return <div className={className}>{body}</div>
}

export function BudgetPaymentRow({
  payment,
  categoryName,
  showCategory = true,
}: {
  payment: BudgetPayment
  categoryName?: string
  showCategory?: boolean
}) {
  const dateLabel = formatShortDate(payment.due_date)
  const meta = [showCategory ? categoryName || 'Uncategorized' : null, dateLabel]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="flex items-center justify-between gap-3 border-b border-gold/15 px-3 py-2 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium leading-tight text-white/90">
          {payment.title}
        </p>
        {meta ? (
          <p className="mt-0.5 truncate text-[10px] leading-snug text-white/45">{meta}</p>
        ) : null}
      </div>
      <p
        className={cn(
          'shrink-0 font-display text-[13px] font-semibold tabular-nums',
          AMOUNT_TONE[payment.status],
        )}
      >
        {formatCurrency(Number(payment.amount))}
      </p>
    </div>
  )
}

export function TotalBudgetForm({
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

export function CategoryForm({
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
    defaultValues: { name: '', description: '', allocated: 0, sort_order: 0, ...defaultValues },
  })
  const allocatedWords = formatAmountInWords(Number(form.watch('allocated')))
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="What does this category cover?"
                  className="min-h-0 resize-none text-base"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="allocated"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allocated (₹)</FormLabel>
              <FormControl>
                <Input type="number" min={0} {...field} />
              </FormControl>
              {allocatedWords ? (
                <p className="text-[11px] leading-snug text-gold/70">{allocatedWords}</p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
