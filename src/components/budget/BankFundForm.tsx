import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { PaymentCatalogChips } from '@/components/PaymentCatalogChips'
import { DatePickerField } from '@/components/budget/shared'
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
import { bankFundSchema, type BankFundInput } from '@/lib/validations'
import { CATALOG_LABELS } from '@/lib/paymentCatalog'
import { cn, formatAmountInWords } from '@/lib/utils'
import type { BankFundAvailability, PaymentMakerType, PaymentSourceType } from '@/lib/types'

const AVAILABILITY_OPTIONS: {
  value: BankFundAvailability
  label: string
  active: string
}[] = [
  {
    value: 'now',
    label: 'Available',
    active: 'border-transparent bg-emerald-400/90 text-[#07140f]',
  },
  {
    value: 'scheduled',
    label: 'Scheduled',
    active: 'border-transparent bg-amber-400 text-[#1a1208]',
  },
  {
    value: 'expected',
    label: 'Expected',
    active: 'border-transparent bg-white/85 text-[#120a1c]',
  },
]

export function BankFundForm({
  defaultValues,
  makers = [],
  sources = [],
  onManageMakers,
  onManageSources,
  onSubmit,
  formId = 'bank-fund-form',
  onSubmittingChange,
}: {
  defaultValues?: Partial<BankFundInput>
  makers?: PaymentMakerType[]
  sources?: PaymentSourceType[]
  onManageMakers?: () => void
  onManageSources?: () => void
  onSubmit: (values: BankFundInput) => Promise<void>
  formId?: string
  onSubmittingChange?: (submitting: boolean) => void
}) {
  const form = useForm<BankFundInput>({
    resolver: zodResolver(bankFundSchema),
    defaultValues: {
      label: '',
      payment_source: '',
      made_by: '',
      availability: 'now',
      amount: undefined as unknown as number,
      expected_date: '',
      notes: '',
      sort_order: 0,
      ...defaultValues,
    },
  })

  const availability = form.watch('availability')
  const amountWords = formatAmountInWords(Number(form.watch('amount')))

  useEffect(() => {
    if (availability === 'now') {
      form.setValue('expected_date', '')
    }
  }, [availability, form])

  useEffect(() => {
    onSubmittingChange?.(form.formState.isSubmitting)
  }, [form.formState.isSubmitting, onSubmittingChange])

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(onSubmit, (errors) => {
          const first = Object.values(errors)[0]
          if (first?.message) toast.error(String(first.message))
        })}
        className="space-y-4"
      >
        <div className="space-y-2">
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <div className="flex w-max max-w-full items-baseline gap-0.5 border-b border-gold/30 pb-1">
                    <span className="font-display text-lg font-semibold leading-none text-gold/80">
                      ₹
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="0"
                      className="h-auto min-h-0 w-[10ch] max-w-full border-0 bg-transparent px-0 py-0 text-left font-display text-2xl font-semibold leading-none tabular-nums text-gold shadow-none placeholder:text-gold/30 focus-visible:ring-0 focus-visible:ring-offset-0"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={
                        field.value === undefined ||
                        field.value === null ||
                        Number.isNaN(Number(field.value))
                          ? ''
                          : field.value
                      }
                      onChange={(e) => {
                        const raw = e.target.value
                        field.onChange(raw === '' ? undefined : Number(raw))
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="label"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <FormControl>
                  <Input
                    placeholder="Description (optional)"
                    className="h-auto min-h-0 w-full border-0 border-b border-gold/30 bg-transparent px-0 py-0 pb-1 text-base text-white/85 shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {amountWords ? (
            <p className="text-[11px] leading-snug text-gold/70">{amountWords}</p>
          ) : (
            <p className="text-[11px] leading-snug text-white/40">
              Leave description blank to use account and from.
            </p>
          )}
        </div>

        <FormField
          control={form.control}
          name="payment_source"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <PaymentCatalogChips
                label={CATALOG_LABELS.source.field}
                value={field.value ?? ''}
                onChange={field.onChange}
                options={sources.map((s) => ({ key: s.key, label: s.label }))}
                onManage={onManageSources}
                allowNone={false}
                emptyHint={CATALOG_LABELS.source.emptyHint}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="made_by"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <PaymentCatalogChips
                label={CATALOG_LABELS.maker.field}
                value={field.value ?? ''}
                onChange={field.onChange}
                options={makers.map((m) => ({ key: m.key, label: m.label }))}
                onManage={onManageMakers}
                emptyHint={CATALOG_LABELS.maker.emptyHint}
              />
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                When available
              </p>
              <FormControl>
                <div className="flex flex-wrap gap-1">
                  {AVAILABILITY_OPTIONS.map((option) => {
                    const active = field.value === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => field.onChange(option.value)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                          active
                            ? option.active
                            : 'border-gold/25 text-white/60 hover:bg-white/5',
                        )}
                      >
                        {option.label}
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {availability !== 'now' && (
          <FormField
            control={form.control}
            name="expected_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {availability === 'scheduled' ? 'Expected date' : 'Expected date (optional)'}
                </FormLabel>
                <FormControl>
                  <DatePickerField
                    name={field.name}
                    value={field.value ?? ''}
                    onBlur={field.onBlur}
                    onChange={field.onChange}
                    placeholder="Pick date"
                    allowClear={availability === 'expected'}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Any extra detail"
                  className="min-h-0 resize-none text-base"
                  {...field}
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
