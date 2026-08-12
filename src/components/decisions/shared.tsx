import { useEffect, useRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'
import { decisionSchema, type DecisionInput } from '@/lib/validations'

export function formatDecisionDate(value: string) {
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
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
          'inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border px-2 text-[12px] transition-colors',
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

export function DecisionForm({
  formId,
  defaultValues,
  onSubmit,
  onSubmittingChange,
}: {
  formId: string
  defaultValues?: Partial<DecisionInput>
  onSubmit: (values: DecisionInput) => Promise<void>
  onSubmittingChange?: (submitting: boolean) => void
}) {
  const form = useForm<DecisionInput>({
    resolver: zodResolver(decisionSchema),
    defaultValues: {
      decision_date: new Date().toISOString().slice(0, 10),
      text: '',
      ...defaultValues,
    },
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
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Note</p>
              <FormControl>
                <Textarea
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
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Date</p>
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

export function DecisionDrawerShell({
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
      <DrawerContent className="flex max-h-[min(72dvh,540px)] flex-col overflow-hidden">
        <DrawerHeader className="relative shrink-0 border-b border-gold/15 px-3 py-2 pr-10 text-left">
          <DrawerTitle className="text-lg">{title}</DrawerTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1.5 h-8 w-8 text-white/70 hover:text-gold"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-2 pt-2 [touch-action:pan-y]">
          {children}
        </div>
        {footer ? (
          <DrawerFooter className="shrink-0 border-t border-gold/20">{footer}</DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
