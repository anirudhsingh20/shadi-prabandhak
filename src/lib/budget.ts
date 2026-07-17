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
