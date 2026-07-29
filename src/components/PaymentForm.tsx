import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ImagePlus, Plus, X } from 'lucide-react'
import { ImageLightbox } from '@/components/ImageLightbox'
import { PaymentTitleInput } from '@/components/PaymentTitleInput'
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
import { cn, formatAmountInWords } from '@/lib/utils'
import { budgetPaymentSchema, type BudgetPaymentInput } from '@/lib/validations'
import type {
  BudgetCategory,
  BudgetPaymentStatus,
  PaymentMakerType,
  PaymentSourceType,
} from '@/lib/types'

const STATUS_OPTIONS: {
  value: BudgetPaymentStatus
  label: string
  active: string
}[] = [
  {
    value: 'done',
    label: 'Paid',
    active: 'border-transparent bg-emerald-400 text-[#07140f]',
  },
  {
    value: 'pending',
    label: 'Pending',
    active: 'border-transparent bg-amber-400 text-[#1a1208]',
  },
  {
    value: 'may_come',
    label: 'May come',
    active: 'border-transparent bg-white/85 text-[#120a1c]',
  },
]

type LocalImage = {
  key: string
  previewUrl: string
  source: 'existing' | 'new'
  url?: string
  file?: File
}

export type PaymentImageChange = {
  files: File[]
  keptUrls: string[]
}

export function PaymentForm({
  categories,
  makers = [],
  sources = [],
  defaultValues,
  existingImageUrls,
  titleSuggestions = [],
  onManageMakers,
  onManageSources,
  onSubmit,
  formId = 'payment-form',
  onSubmittingChange,
}: {
  categories: BudgetCategory[]
  makers?: PaymentMakerType[]
  sources?: PaymentSourceType[]
  defaultValues?: Partial<BudgetPaymentInput>
  existingImageUrls?: string[]
  titleSuggestions?: string[]
  onManageMakers?: () => void
  onManageSources?: () => void
  onSubmit: (values: BudgetPaymentInput, image: PaymentImageChange) => Promise<void>
  formId?: string
  onSubmittingChange?: (submitting: boolean) => void
}) {
  const galleryRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const blobUrlsRef = useRef<string[]>([])
  const [images, setImages] = useState<LocalImage[]>(() =>
    (existingImageUrls ?? []).map((url) => ({
      key: url,
      previewUrl: url,
      source: 'existing' as const,
      url,
    })),
  )
  const [imageError, setImageError] = useState<string | null>(null)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)

  const form = useForm<BudgetPaymentInput>({
    resolver: zodResolver(budgetPaymentSchema),
    defaultValues: {
      title: '',
      amount: undefined as unknown as number,
      status: 'done',
      category_id: '',
      due_date: '',
      notes: '',
      made_by: '',
      payment_source: '',
      ...defaultValues,
    },
  })
  const amountWords = formatAmountInWords(Number(form.watch('amount')))
  useEffect(() => {
    const submitting = form.formState.isSubmitting
    onSubmittingChange?.(submitting)
  }, [form.formState.isSubmitting, onSubmittingChange])

  useEffect(() => {
    const blobs = blobUrlsRef.current
    return () => {
      for (const url of blobs) URL.revokeObjectURL(url)
    }
  }, [])

  const pickFiles = (fileList: FileList | null) => {
    setImageError(null)
    if (!fileList?.length) return

    const next: LocalImage[] = []
    for (const file of Array.from(fileList)) {
      try {
        assertPaymentImageFile(file)
        const previewUrl = URL.createObjectURL(file)
        blobUrlsRef.current.push(previewUrl)
        next.push({
          key: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
          previewUrl,
          source: 'new',
          file,
        })
      } catch (e) {
        setImageError(e instanceof Error ? e.message : 'Invalid image')
        return
      }
    }
    setImages((prev) => [...prev, ...next])
  }

  const removeImage = (key: string) => {
    setImages((prev) => {
      const target = prev.find((img) => img.key === key)
      if (target?.source === 'new') {
        URL.revokeObjectURL(target.previewUrl)
        blobUrlsRef.current = blobUrlsRef.current.filter((u) => u !== target.previewUrl)
      }
      return prev.filter((img) => img.key !== key)
    })
    setImageError(null)
    if (galleryRef.current) galleryRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
  }

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit((values) =>
          onSubmit(values, {
            files: images.flatMap((img) => (img.file ? [img.file] : [])),
            keptUrls: images.flatMap((img) => (img.url ? [img.url] : [])),
          }),
        )}
        className="space-y-4"
      >
        {/* Amount + description */}
        <div className="space-y-0.5">
          <div className="flex items-end gap-3">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="shrink-0 space-y-0">
                  <FormControl>
                    <div className="flex w-max shrink-0 items-baseline gap-0.5 border-b border-gold/30 pb-1">
                      <span className="font-display text-lg font-semibold leading-none text-gold/80">₹</span>
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        placeholder="0"
                        className="h-auto min-h-0 w-[8ch] max-w-[8ch] shrink-0 border-0 bg-transparent px-0 py-0 text-left font-display text-2xl font-semibold leading-none tabular-nums text-gold shadow-none placeholder:text-gold/30 focus-visible:ring-0 focus-visible:ring-offset-0"
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
              name="title"
              render={({ field }) => (
                <FormItem className="min-w-0 flex-1 space-y-0">
                  <FormControl>
                    <PaymentTitleInput
                      suggestions={titleSuggestions}
                      name={field.name}
                      ref={field.ref}
                      value={field.value ?? ''}
                      onBlur={field.onBlur}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          {amountWords ? (
            <p className="pt-1.5 text-[11px] leading-snug text-gold/70">{amountWords}</p>
          ) : null}
        </div>

        {/* Status + due date */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Status</p>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <div className="flex flex-wrap gap-1">
                      {STATUS_OPTIONS.map((opt) => {
                        const active = field.value === opt.value
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={cn(
                              'flex h-[22px] items-center rounded-full border px-2.5 text-[11px] font-semibold leading-none transition-colors',
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
          </div>
          <div className="w-[7.5rem] shrink-0 space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Due</p>
            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="space-y-0">
                  <FormControl>
                    <Input
                      type="date"
                      className="h-[22px] w-full border-0 bg-transparent p-0 text-[11px] leading-none text-white/70 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 [color-scheme:dark] [&::-webkit-calendar-picker-indicator]:ml-auto [&::-webkit-calendar-picker-indicator]:h-3.5 [&::-webkit-calendar-picker-indicator]:w-3.5 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

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

        {/* Made by */}
        <FormField
          control={form.control}
          name="made_by"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                  Made by
                </p>
                {onManageMakers ? (
                  <button
                    type="button"
                    onClick={onManageMakers}
                    className="inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[11px] font-medium text-gold hover:bg-white/[0.04]"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                ) : null}
              </div>
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
                  {makers.map((m) => {
                    const active = field.value === m.key
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => field.onChange(m.key)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                          active
                            ? 'border-transparent bg-gold text-gold-foreground'
                            : 'border-gold/25 text-white/60 hover:bg-white/5',
                        )}
                      >
                        {m.label}
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              {makers.length === 0 && (
                <p className="text-[11px] text-white/40">
                  No options yet — tap Add (e.g. Bride, Groom).
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Payment source */}
        <FormField
          control={form.control}
          name="payment_source"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                  Payment source
                </p>
                {onManageSources ? (
                  <button
                    type="button"
                    onClick={onManageSources}
                    className="inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[11px] font-medium text-gold hover:bg-white/[0.04]"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </button>
                ) : null}
              </div>
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
                  {sources.map((s) => {
                    const active = field.value === s.key
                    return (
                      <button
                        key={s.key}
                        type="button"
                        onClick={() => field.onChange(s.key)}
                        className={cn(
                          'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                          active
                            ? 'border-transparent bg-gold text-gold-foreground'
                            : 'border-gold/25 text-white/60 hover:bg-white/5',
                        )}
                      >
                        {s.label}
                      </button>
                    )
                  })}
                </div>
              </FormControl>
              {sources.length === 0 && (
                <p className="text-[11px] text-white/40">
                  No sources yet — tap Add (e.g. Cash, SBI).
                </p>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Receipt images */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
            Receipts{images.length > 0 ? ` · ${images.length}` : ''}
          </p>
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              pickFiles(e.target.files)
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
              pickFiles(e.target.files)
              e.target.value = ''
            }}
          />

          {images.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {images.map((img, index) => (
                <div key={img.key} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewerIndex(index)}
                    className="block overflow-hidden rounded-md border border-gold/20 bg-black/20 transition-colors hover:border-gold/40"
                    aria-label={`View receipt ${index + 1}`}
                  >
                    <img
                      src={img.previewUrl}
                      alt={`Receipt ${index + 1}`}
                      className="max-h-28 w-auto object-contain"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeImage(img.key)
                    }}
                    className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white/90 hover:bg-black/80"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <ImageLightbox
            images={images.map((img, index) => ({
              src: img.previewUrl,
              alt: `Receipt ${index + 1}`,
            }))}
            open={viewerIndex !== null}
            index={viewerIndex ?? 0}
            onOpenChange={(open) => {
              if (!open) setViewerIndex(null)
            }}
            onIndexChange={setViewerIndex}
          />

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
          {imageError && <p className="text-[11px] text-destructive">{imageError}</p>}
        </div>

        {/* Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Notes</p>
              <FormControl>
                <Textarea
                  rows={2}
                  placeholder="Optional…"
                  className="min-h-[2.5rem] resize-none border-0 border-b border-gold/20 bg-transparent px-0 py-1 text-xs shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
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
