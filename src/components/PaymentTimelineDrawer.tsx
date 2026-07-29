import { useEffect, useMemo, useState } from 'react'
import { Image, X } from 'lucide-react'
import { ImageLightbox } from '@/components/ImageLightbox'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  buildPaymentTimeline,
  paymentTitleSummaries,
  paymentTimelineDate,
  recentPaymentTitles,
} from '@/lib/budget'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { BudgetPayment, BudgetPaymentStatus } from '@/lib/types'

const STATUS_TONE: Record<BudgetPaymentStatus, { amount: string; dot: string }> = {
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

const STATUS_FILTERS: { value: 'all' | BudgetPaymentStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'done', label: 'Paid' },
  { value: 'pending', label: 'Pending' },
  { value: 'may_come', label: 'May come' },
]

function formatTimelineDay(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function PaymentTimelineDrawer({
  open,
  onOpenChange,
  payments,
  categoryMap,
  makerMap = {},
  sourceMap = {},
  onOpenPayment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  payments: BudgetPayment[]
  categoryMap: Record<string, string>
  makerMap?: Record<string, string>
  sourceMap?: Record<string, string>
  onOpenPayment: (payment: BudgetPayment) => void
}) {
  const [titleFilter, setTitleFilter] = useState<'all' | string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | BudgetPaymentStatus>('done')
  const [showPhotos, setShowPhotos] = useState(true)
  const [lightbox, setLightbox] = useState<{ urls: string[]; index: number } | null>(null)

  useEffect(() => {
    if (!open) {
      setTitleFilter('all')
      setStatusFilter('done')
      setLightbox(null)
    }
  }, [open])

  useEffect(() => {
    if (!showPhotos) setLightbox(null)
  }, [showPhotos])

  const paymentsForTitle = useMemo(() => {
    if (titleFilter === 'all') return payments
    return payments.filter((p) => p.title.trim().toLowerCase() === titleFilter.toLowerCase())
  }, [payments, titleFilter])

  const statusCounts = useMemo(() => {
    const base = paymentsForTitle
    return {
      all: base.length,
      done: base.filter((p) => p.status === 'done').length,
      pending: base.filter((p) => p.status === 'pending').length,
      may_come: base.filter((p) => p.status === 'may_come').length,
    }
  }, [paymentsForTitle])

  const titleOptions = useMemo(() => recentPaymentTitles(payments, 100), [payments])
  const titleSummaries = useMemo(() => paymentTitleSummaries(payments), [payments])
  const timeline = useMemo(
    () => buildPaymentTimeline(payments, titleFilter, statusFilter),
    [payments, titleFilter, statusFilter],
  )

  const selectedSummary = useMemo(() => {
    if (titleFilter === 'all') return null
    const matching = payments.filter(
      (p) => p.title.trim().toLowerCase() === titleFilter.toLowerCase(),
    )
    const filtered =
      statusFilter === 'all'
        ? matching
        : matching.filter((p) => p.status === statusFilter)
    if (!filtered.length) {
      return {
        title: matching[0]?.title ?? titleFilter,
        count: 0,
        total: 0,
        paid: 0,
        pending: 0,
        mayCome: 0,
        lastDate: '',
      }
    }
    return paymentTitleSummaries(filtered)[0] ?? null
  }, [titleFilter, statusFilter, payments])

  const visibleCount = useMemo(
    () => timeline.reduce((count, group) => count + group.items.length, 0),
    [timeline],
  )

  const grandTotal = useMemo(
    () => timeline.reduce((sum, group) => sum + group.total, 0),
    [timeline],
  )

  const handleOpenPayment = (payment: BudgetPayment) => {
    onOpenChange(false)
    onOpenPayment(payment)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      dismissible={false}
      shouldScaleBackground={false}
      repositionInputs={false}
      fixed
    >
      <DrawerContent className="max-h-[92vh]">
        <DrawerHeader className="relative shrink-0 pr-10 text-left">
          <DrawerTitle>Expense timeline</DrawerTitle>
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-4 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">View by title</p>
              <button
                type="button"
                onClick={() => setShowPhotos((on) => !on)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                  showPhotos
                    ? 'border-transparent bg-gold text-gold-foreground'
                    : 'border-gold/25 text-white/65 hover:bg-white/5',
                )}
                aria-pressed={showPhotos}
              >
                <Image className="h-3 w-3" aria-hidden />
                {showPhotos ? 'Hide photos' : 'Show photos'}
              </button>
            </div>
            <Select
              value={titleFilter}
              onValueChange={(value) => setTitleFilter(value)}
            >
              <SelectTrigger className="h-9 border-gold/25 bg-white/[0.03] text-xs">
                <SelectValue placeholder="All expenses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All expenses</SelectItem>
                {titleOptions.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">Status</p>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((filter) => {
                const active = statusFilter === filter.value
                const count = statusCounts[filter.value]
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors',
                      active
                        ? 'border-transparent bg-gold text-gold-foreground'
                        : 'border-gold/25 text-white/65 hover:bg-white/5',
                    )}
                  >
                    {filter.label}
                    <span className={cn('ml-1 tabular-nums', active ? 'opacity-80' : 'text-white/40')}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {selectedSummary ? (
            <div className="rounded-lg border border-gold/25 bg-white/[0.03] px-3 py-2.5">
              <p className="truncate text-sm font-medium text-white/90">{selectedSummary.title}</p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/55">
                <span>{selectedSummary.count} payments</span>
                <span className="tabular-nums text-gold">{formatCurrency(selectedSummary.total)} total</span>
                {selectedSummary.paid > 0 && (
                  <span className="tabular-nums text-emerald-400">
                    {formatCurrencyCompact(selectedSummary.paid)} paid
                  </span>
                )}
                {selectedSummary.pending > 0 && (
                  <span className="tabular-nums text-amber-300">
                    {formatCurrencyCompact(selectedSummary.pending)} pending
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-gold/25 bg-white/[0.03] px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wide text-white/45">All expenses</p>
              <p className="mt-1 font-display text-lg font-semibold tabular-nums text-gold">
                {formatCurrency(grandTotal)}
              </p>
              <p className="mt-0.5 text-[11px] text-white/50">
                {visibleCount} payments across {titleSummaries.length} titles
              </p>
            </div>
          )}

          {timeline.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/50">No payments to show.</p>
          ) : (
            <div className="space-y-5">
              {timeline.map((group) => (
                <section key={group.label}>
                  <div className="mb-2 flex items-baseline justify-between gap-3">
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/45">
                      {group.label}
                    </h3>
                    <div className="text-right">
                      <p className="font-display text-sm font-semibold tabular-nums text-white/85">
                        {formatCurrencyCompact(group.total)}
                      </p>
                      {group.paidTotal < group.total && (
                        <p className="text-[10px] tabular-nums text-emerald-400/80">
                          {formatCurrencyCompact(group.paidTotal)} paid
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="relative pl-4">
                    <div
                      className="absolute bottom-2 left-[5px] top-2 w-px bg-gold/20"
                      aria-hidden
                    />
                    <ul className="space-y-0">
                      {group.items.map((payment, index) => {
                        const tone = STATUS_TONE[payment.status]
                        const date = paymentTimelineDate(payment)
                        const categoryName = payment.category_id
                          ? categoryMap[payment.category_id]
                          : undefined
                        const madeByLabel = payment.made_by
                          ? makerMap[payment.made_by] ?? payment.made_by
                          : undefined
                        const sourceLabel = payment.payment_source
                          ? sourceMap[payment.payment_source] ?? payment.payment_source
                          : undefined
                        const meta = [categoryName, madeByLabel, sourceLabel]
                          .filter(Boolean)
                          .join(' · ')
                        const images = payment.image_urls ?? []

                        return (
                          <li key={payment.id} className="relative">
                            <span
                              className={cn(
                                'absolute -left-4 top-4 h-2.5 w-2.5 rounded-full ring-4',
                                tone.dot,
                              )}
                              aria-hidden
                            />
                            <div
                              className={cn(
                                'rounded-md py-2.5 pl-2 pr-1 transition-colors hover:bg-white/[0.04]',
                                index < group.items.length - 1 && 'border-b border-white/[0.05]',
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => handleOpenPayment(payment)}
                                className="flex w-full items-start gap-3 text-left"
                              >
                                <div className="w-14 shrink-0 pt-0.5">
                                  <p className="text-[11px] font-medium tabular-nums text-white/45">
                                    {formatTimelineDay(date)}
                                  </p>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-white/90">
                                    {payment.title}
                                  </p>
                                  {meta ? (
                                    <p className="mt-0.5 truncate text-[10px] leading-snug text-white/45">
                                      {meta}
                                    </p>
                                  ) : null}
                                </div>
                                <div className="shrink-0 text-right">
                                  <p
                                    className={cn(
                                      'font-display text-sm font-semibold tabular-nums',
                                      tone.amount,
                                    )}
                                  >
                                    {formatCurrency(Number(payment.amount))}
                                  </p>
                                </div>
                              </button>

                              {showPhotos && images.length > 0 ? (
                                <div className="mt-2 flex gap-1.5 overflow-x-auto pl-[4.5rem] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                                  {images.map((url, imageIndex) => (
                                    <button
                                      key={url}
                                      type="button"
                                      aria-label={`View receipt ${imageIndex + 1} for ${payment.title}`}
                                      onClick={() =>
                                        setLightbox({ urls: images, index: imageIndex })
                                      }
                                      className="shrink-0 overflow-hidden rounded-md border border-gold/20 bg-black/20 transition-colors hover:border-gold/40"
                                    >
                                      <img
                                        src={url}
                                        alt={`Receipt ${imageIndex + 1}`}
                                        className="max-h-16 w-auto object-contain"
                                      />
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </DrawerContent>

      <ImageLightbox
        images={(lightbox?.urls ?? []).map((src, index) => ({
          src,
          alt: `Receipt ${index + 1}`,
        }))}
        open={lightbox !== null}
        index={lightbox?.index ?? 0}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setLightbox(null)
        }}
        onIndexChange={(index) => {
          setLightbox((prev) => (prev ? { ...prev, index } : null))
        }}
      />
    </Drawer>
  )
}
