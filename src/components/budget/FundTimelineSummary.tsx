import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { FundTimelinePoint } from '@/lib/bankFunds'

function formatDelta(amount: number) {
  if (amount <= 0) return null
  return `+${formatCurrencyCompact(amount)}`
}

export function FundTimelineSummary({ points }: { points: FundTimelinePoint[] }) {
  const nowPoint = points.find((point) => point.monthKey === 'now')
  const futurePoints = points.filter((point) => point.monthKey !== 'now')

  if (futurePoints.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-white/60">
        Add scheduled or expected entries to see month-by-month projections.
      </p>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[10px] text-white/45">
        <span className="uppercase tracking-wide">Scroll timeline</span>
        <span className="tabular-nums">{futurePoints.length} months</span>
      </div>

      <div className="timeline-scroll-x -mx-1 px-1 pb-0.5">
        <div className="relative flex min-w-min items-stretch gap-0.5">
          {futurePoints.length > 1 ? (
            <div
              className="pointer-events-none absolute top-[3px] z-0 h-px bg-gold/35 left-[calc(96px/2)] right-[calc(96px/2)] sm:left-[calc(104px/2)] sm:right-[calc(104px/2)]"
              aria-hidden
            />
          ) : null}
          {futurePoints.map((point, index) => {
            const prev = index > 0 ? futurePoints[index - 1] : (nowPoint ?? null)
            const confirmedDelta = prev
              ? point.confirmedTotal - prev.confirmedTotal
              : 0
            const hasExpectedGap = point.withExpectedTotal > point.confirmedTotal

            return (
              <article
                key={point.monthKey}
                className={cn(
                  'relative z-[1] flex w-[96px] shrink-0 snap-start flex-col scroll-ml-1 sm:w-[104px]',
                  index === futurePoints.length - 1 && 'scroll-mr-1',
                )}
              >
                <div className="flex shrink-0 flex-col items-center">
                  <span
                    className="relative z-10 h-2 w-2 shrink-0 rounded-full bg-gold/70 ring-[3px] ring-gold/15"
                    aria-hidden
                  />
                  <p className="mt-0.5 max-w-full truncate text-center text-[9px] font-medium uppercase tracking-wide text-white/55">
                    {point.label}
                  </p>
                </div>

                <div className="mx-0.5 mt-0.5 flex min-h-[72px] flex-1 flex-col rounded border border-gold/25 bg-white/[0.03] px-1 py-0.5 text-center">
                  <div className="flex h-[10px] items-center justify-center gap-0.5 leading-none">
                    {confirmedDelta > 0 ? (
                      <span className="text-[8px] font-medium tabular-nums text-emerald-400/90">
                        {formatDelta(confirmedDelta)}
                      </span>
                    ) : (
                      <span className="invisible text-[8px] font-medium tabular-nums">+₹0</span>
                    )}
                  </div>
                  <p
                    className="font-display text-sm font-semibold leading-none tabular-nums text-gold"
                    title={formatCurrency(point.confirmedTotal)}
                  >
                    {formatCurrencyCompact(point.confirmedTotal)}
                  </p>
                  <p className="mt-px text-[8px] uppercase tracking-wide text-white/40">
                    Confirmed
                  </p>

                  <div
                    className={cn('mt-0.5 flex flex-col', !hasExpectedGap && 'invisible')}
                    aria-hidden={!hasExpectedGap}
                  >
                    <div className="my-0.5 h-px bg-gold/15" aria-hidden />
                    <p
                      className="font-display text-[11px] font-medium leading-none tabular-nums text-white/75"
                      title={formatCurrency(point.withExpectedTotal)}
                    >
                      {formatCurrencyCompact(point.withExpectedTotal)}
                    </p>
                    <p className="mt-px text-[8px] uppercase tracking-wide text-white/40">
                      Expected
                    </p>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
