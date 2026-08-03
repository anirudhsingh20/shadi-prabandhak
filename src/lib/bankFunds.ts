import type { BankFund, BankFundAvailability } from '@/lib/types'

export const FUND_AVAILABILITY_LABEL: Record<BankFundAvailability, string> = {
  now: 'Available now',
  scheduled: 'Scheduled',
  expected: 'Expected',
}

export const FUND_SECTION_SHORT: Record<BankFundAvailability, string> = {
  now: 'Available',
  scheduled: 'Scheduled',
  expected: 'Expected',
}

export const FUND_COUNT_TONE: Record<BankFundAvailability, string> = {
  now: 'text-emerald-400',
  scheduled: 'text-amber-300',
  expected: 'text-white/65',
}

export type FundAvailabilityTotals = {
  now: number
  scheduled: number
  expected: number
}

export type FundTimelinePoint = {
  monthKey: string
  label: string
  confirmedTotal: number
  withExpectedTotal: number
}

export type GroupedFunds = Record<BankFundAvailability, BankFund[]>

function fundAmount(fund: BankFund) {
  return Number(fund.amount) || 0
}

function parseYearMonth(iso: string) {
  const [year, month] = iso.split('-').map(Number)
  return { year, month }
}

function monthEndIso(year: number, monthIndex: number) {
  const d = new Date(year, monthIndex + 1, 0)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function monthLabel(year: number, monthIndex: number) {
  const d = new Date(year, monthIndex, 1)
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function monthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function isOnOrBeforeMonthEnd(dateIso: string, year: number, monthIndex: number) {
  return dateIso <= monthEndIso(year, monthIndex)
}

function sumNowFunds(funds: BankFund[]) {
  return funds
    .filter((f) => f.availability === 'now')
    .reduce((sum, f) => sum + fundAmount(f), 0)
}

function sumScheduledByMonthEnd(funds: BankFund[], year: number, monthIndex: number) {
  return funds
    .filter(
      (f) =>
        f.availability === 'scheduled' &&
        f.expected_date &&
        isOnOrBeforeMonthEnd(f.expected_date, year, monthIndex),
    )
    .reduce((sum, f) => sum + fundAmount(f), 0)
}

function sumExpectedByMonthEnd(funds: BankFund[], year: number, monthIndex: number) {
  return funds
    .filter((f) => {
      if (f.availability !== 'expected') return false
      if (!f.expected_date) return true
      return isOnOrBeforeMonthEnd(f.expected_date, year, monthIndex)
    })
    .reduce((sum, f) => sum + fundAmount(f), 0)
}

function computeTotalsAtMonth(funds: BankFund[], year: number, monthIndex: number) {
  const confirmedTotal = sumNowFunds(funds) + sumScheduledByMonthEnd(funds, year, monthIndex)
  const withExpectedTotal = confirmedTotal + sumExpectedByMonthEnd(funds, year, monthIndex)
  return { confirmedTotal, withExpectedTotal }
}

export function sumFundsByAvailability(funds: BankFund[]): FundAvailabilityTotals {
  const totals: FundAvailabilityTotals = { now: 0, scheduled: 0, expected: 0 }
  for (const fund of funds) {
    totals[fund.availability] += fundAmount(fund)
  }
  return totals
}

export function groupFundsByAvailability(funds: BankFund[]): GroupedFunds {
  const groups: GroupedFunds = { now: [], scheduled: [], expected: [] }
  for (const fund of funds) {
    groups[fund.availability].push(fund)
  }

  groups.now.sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
  groups.scheduled.sort((a, b) => {
    const dateA = a.expected_date ?? ''
    const dateB = b.expected_date ?? ''
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return a.label.localeCompare(b.label)
  })
  groups.expected.sort((a, b) => {
    const dateA = a.expected_date ?? '9999-12-31'
    const dateB = b.expected_date ?? '9999-12-31'
    if (dateA !== dateB) return dateA.localeCompare(dateB)
    return a.label.localeCompare(b.label)
  })

  return groups
}

export function buildFundTimeline(funds: BankFund[], today = new Date()): FundTimelinePoint[] {
  const startYear = today.getFullYear()
  const startMonth = today.getMonth()

  let maxYear = startYear
  let maxMonth = startMonth

  for (const fund of funds) {
    if (!fund.expected_date) continue
    if (fund.availability !== 'scheduled' && fund.availability !== 'expected') continue
    const { year, month } = parseYearMonth(fund.expected_date)
    if (year > maxYear || (year === maxYear && month > maxMonth + 1)) {
      maxYear = year
      maxMonth = month - 1
    }
  }

  const nowTotals = computeTotalsAtMonth(funds, startYear, startMonth)
  const points: FundTimelinePoint[] = [
    {
      monthKey: 'now',
      label: 'Now',
      confirmedTotal: sumNowFunds(funds),
      withExpectedTotal: nowTotals.withExpectedTotal,
    },
  ]

  let year = startYear
  let monthIndex = startMonth

  while (year < maxYear || (year === maxYear && monthIndex <= maxMonth)) {
    const totals = computeTotalsAtMonth(funds, year, monthIndex)
    points.push({
      monthKey: monthKey(year, monthIndex),
      label: monthLabel(year, monthIndex),
      confirmedTotal: totals.confirmedTotal,
      withExpectedTotal: totals.withExpectedTotal,
    })

    monthIndex += 1
    if (monthIndex > 11) {
      monthIndex = 0
      year += 1
    }
  }

  return points
}

export function computedMoneyInBank(funds: BankFund[]) {
  return sumFundsByAvailability(funds).now
}
