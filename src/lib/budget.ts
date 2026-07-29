import { supabase } from '@/lib/supabase'
import type { BudgetPayment, BudgetPaymentStatus } from '@/lib/types'

export const PAYMENT_STATUS_LABEL: Record<BudgetPaymentStatus, string> = {
  done: 'Done',
  pending: 'Pending',
  may_come: 'May come',
}

export async function syncCategorySpent(weddingId: string, categoryIds: string[]) {
  const unique = [...new Set(categoryIds.filter(Boolean))]
  for (const categoryId of unique) {
    const { data, error } = await supabase
      .from('budget_payments')
      .select('amount')
      .eq('wedding_id', weddingId)
      .eq('category_id', categoryId)
      .eq('status', 'done')
    if (error) throw error
    const spent = (data ?? []).reduce((s, p) => s + Number(p.amount), 0)
    const { error: upErr } = await supabase
      .from('budget_categories')
      .update({ spent })
      .eq('id', categoryId)
    if (upErr) throw upErr
  }
}

export function sumPaymentsByStatus(payments: BudgetPayment[]) {
  let paid = 0
  let pending = 0
  let mayCome = 0
  const paidByCategory: Record<string, number> = {}
  for (const p of payments) {
    const amt = Number(p.amount) || 0
    if (p.status === 'done') {
      paid += amt
      if (p.category_id) paidByCategory[p.category_id] = (paidByCategory[p.category_id] ?? 0) + amt
    } else if (p.status === 'pending') pending += amt
    else mayCome += amt
  }
  return { paid, pending, mayCome, paidByCategory }
}

export type CategoryPaymentRollup = {
  paid: number
  pending: number
  mayCome: number
  count: number
  doneCount: number
  pendingCount: number
  mayComeCount: number
}

export function sumPaymentsByCategory(payments: BudgetPayment[]) {
  const byCategory: Record<string, CategoryPaymentRollup> = {}
  const ensure = (key: string): CategoryPaymentRollup => {
    if (!byCategory[key]) {
      byCategory[key] = {
        paid: 0,
        pending: 0,
        mayCome: 0,
        count: 0,
        doneCount: 0,
        pendingCount: 0,
        mayComeCount: 0,
      }
    }
    return byCategory[key]
  }

  for (const p of payments) {
    const key = p.category_id ?? '__none__'
    const row = ensure(key)
    const amt = Number(p.amount) || 0
    row.count += 1
    if (p.status === 'done') {
      row.paid += amt
      row.doneCount += 1
    } else if (p.status === 'pending') {
      row.pending += amt
      row.pendingCount += 1
    } else {
      row.mayCome += amt
      row.mayComeCount += 1
    }
  }

  return byCategory
}

/** Unique payment titles for autocomplete (case-insensitive dedupe). */
export function uniquePaymentTitles(payments: BudgetPayment[]): string[] {
  const byLower = new Map<string, string>()
  for (const payment of payments) {
    const title = payment.title.trim()
    if (!title) continue
    const key = title.toLowerCase()
    if (!byLower.has(key)) byLower.set(key, title)
  }
  return [...byLower.values()].sort((a, b) => a.localeCompare(b))
}

/** Unique titles ordered by most recently used payment first. */
export function recentPaymentTitles(payments: BudgetPayment[], limit = 40): string[] {
  const seen = new Set<string>()
  const titles: string[] = []
  for (const payment of payments) {
    const title = payment.title.trim()
    if (!title) continue
    const key = title.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    titles.push(title)
    if (titles.length >= limit) break
  }
  return titles
}

export function paymentTimelineDate(payment: BudgetPayment) {
  return payment.due_date || payment.created_at.slice(0, 10)
}

export function paymentTimelineMonthLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  if (Number.isNaN(d.getTime())) return 'Other'
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

export type PaymentTimelineGroup = {
  label: string
  sortKey: string
  items: BudgetPayment[]
  total: number
  paidTotal: number
}

export function buildPaymentTimeline(
  payments: BudgetPayment[],
  titleFilter: string | 'all' = 'all',
  statusFilter: 'all' | BudgetPaymentStatus = 'all',
): PaymentTimelineGroup[] {
  let list = payments
  if (statusFilter !== 'all') {
    list = list.filter((p) => p.status === statusFilter)
  }
  if (titleFilter !== 'all') {
    list = list.filter((p) => p.title.trim().toLowerCase() === titleFilter.toLowerCase())
  }

  const sorted = [...list].sort((a, b) => {
    const da = paymentTimelineDate(a)
    const db = paymentTimelineDate(b)
    if (da !== db) return db.localeCompare(da)
    return b.created_at.localeCompare(a.created_at)
  })

  const order: string[] = []
  const map = new Map<string, BudgetPayment[]>()

  for (const payment of sorted) {
    const date = paymentTimelineDate(payment)
    const label = paymentTimelineMonthLabel(date)
    if (!map.has(label)) {
      map.set(label, [])
      order.push(label)
    }
    map.get(label)!.push(payment)
  }

  return order.map((label) => {
    const items = map.get(label)!
    const sortKey = paymentTimelineDate(items[0]!)
    const total = items.reduce((sum, p) => sum + Number(p.amount), 0)
    const paidTotal = items
      .filter((p) => p.status === 'done')
      .reduce((sum, p) => sum + Number(p.amount), 0)
    return { label, sortKey, items, total, paidTotal }
  })
}

export type PaymentTitleSummary = {
  title: string
  count: number
  total: number
  paid: number
  pending: number
  mayCome: number
  lastDate: string
}

export function paymentTitleSummaries(payments: BudgetPayment[]): PaymentTitleSummary[] {
  const map = new Map<string, PaymentTitleSummary>()

  for (const payment of payments) {
    const title = payment.title.trim()
    if (!title) continue
    const key = title.toLowerCase()
    const amount = Number(payment.amount)
    const date = paymentTimelineDate(payment)
    const existing = map.get(key)

    if (!existing) {
      map.set(key, {
        title,
        count: 1,
        total: amount,
        paid: payment.status === 'done' ? amount : 0,
        pending: payment.status === 'pending' ? amount : 0,
        mayCome: payment.status === 'may_come' ? amount : 0,
        lastDate: date,
      })
      continue
    }

    existing.count += 1
    existing.total += amount
    if (payment.status === 'done') existing.paid += amount
    if (payment.status === 'pending') existing.pending += amount
    if (payment.status === 'may_come') existing.mayCome += amount
    if (date > existing.lastDate) existing.lastDate = date
  }

  return [...map.values()].sort((a, b) => b.lastDate.localeCompare(a.lastDate))
}
