import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Landmark, Pencil, Trash2, User } from 'lucide-react'
import { BankFundForm } from '@/components/budget/BankFundForm'
import { FundTimelineSummary } from '@/components/budget/FundTimelineSummary'
import { BudgetDrawerShell, formatShortDate } from '@/components/budget/shared'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PaymentOptionCatalogDrawer } from '@/components/PaymentOptionCatalogDrawer'
import { Button } from '@/components/ui/button'
import {
  buildFundTimeline,
  FUND_COUNT_TONE,
  FUND_SECTION_SHORT,
  groupFundsByAvailability,
  sumFundsByAvailability,
} from '@/lib/bankFunds'
import { buildFundLabel, catalogUsageCounts, CATALOG_LABELS } from '@/lib/paymentCatalog'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { cn, formatCurrency, formatCurrencyCompact } from '@/lib/utils'
import type { BankFundInput } from '@/lib/validations'
import type {
  BankFund,
  BankFundAvailability,
  BudgetPayment,
  PaymentMakerType,
  PaymentSourceType,
} from '@/lib/types'

type FundMetaPart =
  | { kind: 'account'; label: string }
  | { kind: 'from'; label: string }
  | { kind: 'text'; label: string }

function buildFundRowMeta(
  fund: BankFund,
  sourceLabel?: string,
  madeByLabel?: string,
): FundMetaPart[] {
  const dateLabel = formatShortDate(fund.expected_date)
  const addedLabel = formatShortDate(fund.created_at.slice(0, 10))
  const when =
    dateLabel ??
    (fund.availability === 'now' ? 'Available now' : 'Date not set')

  return [
    { kind: 'account', label: sourceLabel ?? 'Not set' },
    madeByLabel ? { kind: 'from', label: madeByLabel } : null,
    { kind: 'text', label: when },
    addedLabel ? { kind: 'text', label: `Added ${addedLabel}` } : null,
  ].filter((part): part is FundMetaPart => Boolean(part))
}

function FundMetaPartContent({ part }: { part: FundMetaPart }) {
  if (part.kind === 'account') {
    return (
      <>
        <Landmark
          className="h-2.5 w-2.5 shrink-0 text-white/35"
          aria-label={CATALOG_LABELS.source.field}
        />
        <span>{part.label}</span>
      </>
    )
  }

  if (part.kind === 'from') {
    return (
      <>
        <User
          className="h-2.5 w-2.5 shrink-0 text-white/35"
          aria-label={CATALOG_LABELS.maker.field}
        />
        <span>{part.label}</span>
      </>
    )
  }

  return part.label
}

function FundRow({
  fund,
  sourceLabel,
  madeByLabel,
  onEdit,
  onDelete,
}: {
  fund: BankFund
  sourceLabel?: string
  madeByLabel?: string
  onEdit: () => void
  onDelete: () => void
}) {
  const metaParts = buildFundRowMeta(fund, sourceLabel, madeByLabel)

  return (
    <div className="border-b border-gold/15 px-3 py-2 last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 flex-1 text-[13px] font-medium leading-tight text-white/90">
          {fund.label}
        </p>
        <p className="shrink-0 font-display text-[13px] font-semibold tabular-nums text-gold">
          {formatCurrency(Number(fund.amount))}
        </p>
      </div>
      <div className="mt-0.5 flex items-end justify-between gap-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[10px] leading-snug text-white/45">
            {metaParts.map((part, index) => (
              <span
                key={`${part.kind}-${part.label}-${index}`}
                className="inline-flex items-center gap-1"
              >
                {index > 0 ? <span className="text-white/25">·</span> : null}
                <FundMetaPartContent part={part} />
              </span>
            ))}
          </div>
          {fund.notes ? (
            <p className="mt-0.5 text-[10px] leading-snug text-white/35">{fund.notes}</p>
          ) : null}
        </div>
        <div className="-mr-0.5 flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 text-white/35 hover:text-white/70 [&_svg]:size-2.5"
            onClick={onEdit}
            aria-label="Edit entry"
          >
            <Pencil />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 p-0 text-white/35 hover:text-white/70 [&_svg]:size-2.5"
            onClick={onDelete}
            aria-label="Delete entry"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  )
}

function FundSection({
  availability,
  funds,
  sourceMap,
  makerMap,
  onEdit,
  onDelete,
}: {
  availability: BankFundAvailability
  funds: BankFund[]
  sourceMap: Record<string, string>
  makerMap: Record<string, string>
  onEdit: (fund: BankFund) => void
  onDelete: (id: string) => void
}) {
  const total = funds.reduce((sum, f) => sum + Number(f.amount), 0)

  return (
    <div className="overflow-hidden rounded-md border border-gold/35">
      <div className="flex items-center justify-between gap-2 border-b border-gold/25 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-white">{FUND_SECTION_SHORT[availability]}</span>
          <span
            className={cn(
              'font-display text-xs font-semibold tabular-nums',
              FUND_COUNT_TONE[availability],
            )}
          >
            {funds.length}
          </span>
        </div>
        <p className="font-display text-sm font-semibold tabular-nums text-gold">
          {formatCurrency(total)}
        </p>
      </div>
      {funds.length === 0 ? (
        <p className="px-3 py-4 text-center text-xs text-white/50">No entries yet.</p>
      ) : (
        funds.map((fund) => (
          <FundRow
            key={fund.id}
            fund={fund}
            sourceLabel={
              fund.payment_source ? sourceMap[fund.payment_source] ?? fund.payment_source : undefined
            }
            madeByLabel={fund.made_by ? makerMap[fund.made_by] ?? fund.made_by : undefined}
            onEdit={() => onEdit(fund)}
            onDelete={() => onDelete(fund.id)}
          />
        ))
      )}
    </div>
  )
}

export function MoneyInBankTabContent({
  funds,
  payments,
  isLoading,
  createOpen,
  onCreateOpenChange,
}: {
  funds: BankFund[]
  payments: BudgetPayment[]
  isLoading: boolean
  createOpen: boolean
  onCreateOpenChange: (open: boolean) => void
}) {
  const qc = useQueryClient()
  const [editFund, setEditFund] = useState<BankFund | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [makersOpen, setMakersOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)

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

  const makerMap = useMemo(
    () => Object.fromEntries(makers.map((m) => [m.key, m.label])),
    [makers],
  )
  const sourceMap = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.key, s.label])),
    [sources],
  )

  const makerUsage = useMemo(
    () => catalogUsageCounts(payments, funds, 'made_by'),
    [payments, funds],
  )
  const sourceUsage = useMemo(
    () => catalogUsageCounts(payments, funds, 'payment_source'),
    [payments, funds],
  )

  const grouped = useMemo(() => groupFundsByAvailability(funds), [funds])
  const timeline = useMemo(() => buildFundTimeline(funds), [funds])
  const totals = useMemo(() => sumFundsByAvailability(funds), [funds])

  const projectionSummary = useMemo(() => {
    const nowPoint = timeline.find((point) => point.monthKey === 'now')
    const lastPoint = timeline[timeline.length - 1]
    const withExpectedTotal = lastPoint?.withExpectedTotal ?? nowPoint?.withExpectedTotal ?? totals.now
    const lastLabel =
      lastPoint && lastPoint.monthKey !== 'now' ? lastPoint.label : null
    const showProjection =
      withExpectedTotal > totals.now || Boolean(lastLabel)

    return { withExpectedTotal, lastLabel, showProjection }
  }, [timeline, totals.now])

  const saveFund = async (values: BankFundInput, id?: string) => {
    const payload = {
      label: buildFundLabel(values, sourceMap, makerMap),
      payment_source: values.payment_source || null,
      made_by: values.made_by || null,
      availability: values.availability,
      amount: Number(values.amount),
      expected_date: values.availability === 'now' ? null : values.expected_date || null,
      notes: values.notes?.trim() || null,
      sort_order: Number(values.sort_order) || 0,
      wedding_id: WEDDING_ID,
    }
    const { error } = id
      ? await supabase.from('bank_funds').update(payload).eq('id', id)
      : await supabase.from('bank_funds').insert(payload)
    if (error) {
      const msg = error.message.includes('payment_source')
        ? 'Database needs migration 015 — run supabase/migrations/015_bank_funds_payment_catalog.sql'
        : error.message
      throw new Error(msg)
    }
    toast.success(id ? 'Entry updated' : 'Entry added')
    qc.invalidateQueries({ queryKey: ['bank-funds'] })
    onCreateOpenChange(false)
    setEditFund(null)
  }

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('bank_funds').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Entry deleted')
      qc.invalidateQueries({ queryKey: ['bank-funds'] })
      setDeleteId(null)
      setEditFund(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-white/60">Loading…</p>
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-md border border-gold/40">
        <div className="border-b border-gold/25 px-3 py-2">
          <div
            className={cn(
              'grid gap-x-3',
              projectionSummary.showProjection ? 'grid-cols-2' : 'grid-cols-1',
            )}
          >
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-white/45">In bank now</p>
              <p
                className="font-display text-lg font-semibold leading-none tabular-nums text-gold"
                title={formatCurrency(totals.now)}
              >
                {formatCurrencyCompact(totals.now)}
              </p>
            </div>
            {projectionSummary.showProjection ? (
              <div className="min-w-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-white/45">With expected</p>
                <p
                  className="font-display text-lg font-semibold leading-none tabular-nums text-white/85"
                  title={formatCurrency(projectionSummary.withExpectedTotal)}
                >
                  {formatCurrencyCompact(projectionSummary.withExpectedTotal)}
                </p>
                {projectionSummary.lastLabel ? (
                  <p className="mt-0.5 text-[10px] text-white/40">
                    till {projectionSummary.lastLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          {(totals.scheduled > 0 || totals.expected > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 border-t border-gold/15 pt-2 text-[10px] text-white/45">
              {totals.scheduled > 0 ? (
                <span>
                  <span
                    className="font-medium tabular-nums text-amber-300/90"
                    title={formatCurrency(totals.scheduled)}
                  >
                    {formatCurrencyCompact(totals.scheduled)}
                  </span>{' '}
                  scheduled
                </span>
              ) : null}
              {totals.scheduled > 0 && totals.expected > 0 ? (
                <span className="text-white/20">·</span>
              ) : null}
              {totals.expected > 0 ? (
                <span>
                  <span
                    className="font-medium tabular-nums text-white/60"
                    title={formatCurrency(totals.expected)}
                  >
                    {formatCurrencyCompact(totals.expected)}
                  </span>{' '}
                  expected
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="border-t border-gold/20 px-3 py-2">
          <p className="mb-1.5 text-[10px] uppercase tracking-wide text-white/55">Projection</p>
          <FundTimelineSummary points={timeline} />
        </div>
      </div>

      <div className="space-y-3">
        {(['now', 'scheduled', 'expected'] as const).map((availability) => (
          <FundSection
            key={availability}
            availability={availability}
            funds={grouped[availability]}
            sourceMap={sourceMap}
            makerMap={makerMap}
            onEdit={setEditFund}
            onDelete={setDeleteId}
          />
        ))}
      </div>

      <BudgetDrawerShell
        open={createOpen}
        onOpenChange={(open) => {
          onCreateOpenChange(open)
          if (!open) setFormSubmitting(false)
        }}
        title="Add money"
        footer={
          <Button
            type="submit"
            form="bank-fund-form-create"
            className="h-9 w-full text-sm"
            disabled={formSubmitting}
          >
            {formSubmitting ? 'Saving…' : 'Save'}
          </Button>
        }
      >
        <BankFundForm
          key={createOpen ? 'create-open' : 'create-closed'}
          formId="bank-fund-form-create"
          makers={makers}
          sources={sources}
          onManageMakers={() => setMakersOpen(true)}
          onManageSources={() => setSourcesOpen(true)}
          onSubmittingChange={setFormSubmitting}
          onSubmit={async (v) => {
            try {
              await saveFund(v)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to save')
              throw e
            }
          }}
        />
      </BudgetDrawerShell>

      <BudgetDrawerShell
        open={!!editFund}
        onOpenChange={(open) => {
          if (!open) {
            setEditFund(null)
            setFormSubmitting(false)
          }
        }}
        title="Edit entry"
        footer={
          editFund ? (
            <div className="flex w-full gap-2">
              <Button
                type="submit"
                form="bank-fund-form-edit"
                className="h-9 flex-1 text-sm"
                disabled={formSubmitting}
              >
                {formSubmitting ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(editFund.id)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      >
        {editFund && (
          <BankFundForm
            key={editFund.id}
            formId="bank-fund-form-edit"
            makers={makers}
            sources={sources}
            onManageMakers={() => setMakersOpen(true)}
            onManageSources={() => setSourcesOpen(true)}
            onSubmittingChange={setFormSubmitting}
            defaultValues={{
              label: editFund.label,
              payment_source: editFund.payment_source ?? '',
              made_by: editFund.made_by ?? '',
              availability: editFund.availability,
              amount: Number(editFund.amount),
              expected_date: editFund.expected_date ?? '',
              notes: editFund.notes ?? '',
              sort_order: editFund.sort_order,
            }}
            onSubmit={async (v) => {
              try {
                await saveFund(v, editFund.id)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to save')
                throw e
              }
            }}
          />
        )}
      </BudgetDrawerShell>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete entry?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />

      <PaymentOptionCatalogDrawer
        kind="makers"
        open={makersOpen}
        onOpenChange={setMakersOpen}
        options={makers}
        usageCounts={makerUsage}
      />
      <PaymentOptionCatalogDrawer
        kind="sources"
        open={sourcesOpen}
        onOpenChange={setSourcesOpen}
        options={sources}
        usageCounts={sourceUsage}
      />
    </div>
  )
}
