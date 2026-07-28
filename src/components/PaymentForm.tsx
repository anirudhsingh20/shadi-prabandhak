import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Camera, ImagePlus, StickyNote, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { assertPaymentImageFile } from '@/lib/payment-image'
import { cn } from '@/lib/utils'
import { budgetPaymentSchema, type BudgetPaymentInput } from '@/lib/validations'
import type { BudgetCategory, BudgetPaymentStatus } from '@/lib/types'

const STATUS_OPTIONS: {
  value: BudgetPaymentStatus
  label: string
  active: string
}[] = [
  {
    value: 'pending',
    label: 'Pending',
    active: 'border-transparent bg-amber-400 text-[#1a1208]',
  },
  {
    value: 'done',
    label: 'Paid',
    active: 'border-transparent bg-emerald-400 text-[#07140f]',
  },
  {
    value: 'may_come',
    label: 'May come',
    active: 'border-transparent bg-white/85 text-[#120a1c]',
  },
]

export type PaymentImageChange = {
  file: File | null
  remove: boolean
}

export function PaymentForm({
  categories,
  defaultValues,
  existingImageUrl,
  onSubmit,
  submitLabel,
  formId = 'payment-form',
}: {
  categories: BudgetCategory[]
  defaultValues?: Partial<BudgetPaymentInput>
  existingImageUrl?: string | null
  onSubmit: (values: BudgetPaymentInput, image: PaymentImageChange) => Promise<void>
  submitLabel: string
  formId?: string
}) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl ?? null)
  const [removeImage, setRemoveImage] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const form = useForm<BudgetPaymentInput>({
    resolver: zodResolver(budgetPaymentSchema),
    defaultValues: {
      title: '',
      amount: undefined as unknown as number,
      status: 'pending',
      category_id: '',
      due_date: '',
      notes: '',
      ...defaultValues,
    },
  })

  useEffect(() => {
    if (!imageFile) return
    const url = URL.createObjectURL(imageFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  const pickFile = (file: File | undefined) => {
    setImageError(null)
    if (!file) return
    try {
      assertPaymentImageFile(file)
      setImageFile(file)
      setRemoveImage(false)
    } catch (e) {
      setImageError(e instanceof Error ? e.message : 'Invalid image')
    }
  }

  const clearImage = () => {
    setImageFile(null)
    setPreviewUrl(null)
    setRemoveImage(true)
    setImageError(null)
    if (galleryRef.current) galleryRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit((values) =>
          onSubmit(values, { file: imageFile, remove: removeImage }),
        )}
        className="space-y-4"
      >
        {/* Amount — left aligned */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Amount</p>
              <FormControl>
                <div className="flex items-baseline gap-1 border-b border-gold/30 pb-1.5">
                  <span className="font-display text-xl font-semibold text-gold/80">₹</span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    placeholder="0"
                    className="h-auto border-0 bg-transparent px-0 text-left font-display text-3xl font-semibold tabular-nums text-gold shadow-none placeholder:text-gold/30 focus-visible:ring-0 focus-visible:ring-offset-0"
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

        {/* Description */}
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem className="space-y-0.5">
              <FormControl>
                <Input
                  placeholder="What was this for?"
                  className="h-9 border-0 border-b border-gold/25 bg-transparent px-0 text-sm shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Status chips */}
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Status</p>
              <FormControl>
                <div className="grid grid-cols-3 gap-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = field.value === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'rounded-full border py-1 text-[11px] font-semibold transition-colors',
                          active
                            ? opt.active
                            : 'border-gold/25 bg-white/[0.03] text-white/65 hover:bg-white/[0.06]',
                        )}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category chips */}
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Category</p>
              <FormControl>
                <div className="flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => field.onChange('')}
                    className={cn(
                      'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                      !field.value
                        ? 'border-transparent bg-gold text-gold-foreground'
                        : 'border-gold/25 text-white/60 hover:bg-white/5',
                    )}
                  >
                    None
                  </button>
                  {categories.map((c) => {
                    const active = field.value === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => field.onChange(c.id)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                          active
                            ? 'border-transparent bg-gold text-gold-foreground'
                            : 'border-gold/25 text-white/60 hover:bg-white/5',
                        )}
                      >
                        {c.name}
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              {categories.length === 0 && (
                <p className="text-[11px] text-white/40">No categories yet — add some on Budget.</p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Receipt image */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Receipt</p>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              pickFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />

          {previewUrl ? (
            <div className="relative overflow-hidden rounded-md border border-gold/20">
              <img
                src={previewUrl}
                alt="Receipt"
                className="max-h-44 w-full object-cover"
              />
              <button
                type="button"
                onClick={clearImage}
                className="absolute right-1.5 top-1.5 rounded-full bg-black/65 p-1 text-white/90 hover:bg-black/80"
                aria-label="Remove image"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-md border border-gold/25 bg-white/[0.03] px-2 py-2.5 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.06]"
              >
                <Camera className="h-3.5 w-3.5 text-gold/80" aria-hidden />
                Camera
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex items-center justify-center gap-1.5 rounded-md border border-gold/25 bg-white/[0.03] px-2 py-2.5 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/[0.06]"
              >
                <ImagePlus className="h-3.5 w-3.5 text-gold/80" aria-hidden />
                Upload
              </button>
            </div>
          )}
          {imageError && <p className="text-[11px] text-destructive">{imageError}</p>}
        </div>

        {/* Due date + Notes — compact rows */}
        <div className="overflow-hidden rounded-md border border-gold/20 divide-y divide-gold/15">
          <FormField
            control={form.control}
            name="due_date"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="flex items-center gap-2 px-2.5 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5 shrink-0 text-gold/70" aria-hidden />
                  <p className="w-16 shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/45">
                    Due
                  </p>
                  <FormControl>
                    <Input
                      type="date"
                      className="h-7 flex-1 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage className="px-2.5 pb-1" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="space-y-0">
                <div className="flex items-start gap-2 px-2.5 py-1.5">
                  <StickyNote className="mt-1 h-3.5 w-3.5 shrink-0 text-gold/70" aria-hidden />
                  <p className="mt-1 w-16 shrink-0 text-[10px] font-medium uppercase tracking-wide text-white/45">
                    Notes
                  </p>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="Optional…"
                      className="min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent px-0 py-0.5 text-xs shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                      {...field}
                    />
                  </FormControl>
                </div>
                <FormMessage className="px-2.5 pb-1" />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="h-9 w-full text-sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Form>
  )
}
