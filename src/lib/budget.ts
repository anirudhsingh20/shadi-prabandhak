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
