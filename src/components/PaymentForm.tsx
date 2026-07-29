import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { CalendarDays, Camera, ImagePlus, StickyNote, X } from 'lucide-react'
import { ImageLightbox } from '@/components/ImageLightbox'
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
  defaultValues,
  existingImageUrls,
  onSubmit,
  formId = 'payment-form',
  onSubmittingChange,
}: {
  categories: BudgetCategory[]
  defaultValues?: Partial<BudgetPaymentInput>
  existingImageUrls?: string[]
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
      status: 'pending',
      category_id: '',
      due_date: '',
      notes: '',
      ...defaultValues,
    },
  })
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
        {/* Amount — left aligned */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => {
            const amountWords = formatAmountInWords(Number(field.value))
            return (
            <FormItem className="space-y-0.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Amount</p>
              <FormControl>
                <div>
                  <div className="flex items-baseline gap-1 border-b border-gold/30 pb-1">
                    <span className="font-display text-xl font-semibold leading-none text-gold/80">₹</span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      placeholder="0"
                      className="h-auto min-h-0 border-0 bg-transparent px-0 py-0 text-left font-display text-3xl font-semibold leading-none tabular-nums text-gold shadow-none placeholder:text-gold/30 focus-visible:ring-0 focus-visible:ring-offset-0"
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
                  {amountWords ? (
                    <p className="pt-1.5 text-[11px] leading-snug text-gold/70">{amountWords}</p>
                  ) : null}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
            )
          }}
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
                <div className="flex flex-wrap gap-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const active = field.value === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => field.onChange(opt.value)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
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
      </form>
    </Form>
  )
}
