import type { BankFund, BudgetPayment } from '@/lib/types'

export const CATALOG_LABELS = {
  source: {
    field: 'Account',
    manage: 'Accounts',
    placeholder: 'e.g. SBI, ICICI RD, Cash',
    emptyHint: 'No accounts yet — tap Add (e.g. SBI, ICICI RD, Cash).',
  },
  maker: {
    field: 'From',
    manage: 'People',
    placeholder: 'e.g. Bride, Groom, Mom',
    emptyHint: 'No people yet — tap Add (e.g. Bride, Groom, Mom).',
  },
} as const

type CatalogColumn = 'made_by' | 'payment_source'

type CatalogUsageRow = Pick<BudgetPayment, CatalogColumn> | Pick<BankFund, CatalogColumn>

export function catalogUsageCounts(
  payments: BudgetPayment[],
  funds: CatalogUsageRow[],
  column: CatalogColumn,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const payment of payments) {
    const key = payment[column]
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  for (const fund of funds) {
    const key = fund[column]
    if (!key) continue
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

export function buildFundLabel(
  values: {
    label?: string
    payment_source?: string
    made_by?: string
  },
  sourceMap: Record<string, string>,
  makerMap: Record<string, string>,
) {
  const custom = values.label?.trim()
  if (custom) return custom

  const parts = [
    values.payment_source ? sourceMap[values.payment_source] ?? values.payment_source : null,
    values.made_by ? makerMap[values.made_by] ?? values.made_by : null,
  ].filter(Boolean)

  return parts.join(' · ') || 'Money entry'
}
