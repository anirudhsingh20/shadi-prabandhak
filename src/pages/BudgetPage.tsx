import { useQuery } from '@tanstack/react-query'
import { BudgetTabContent } from '@/components/budget/BudgetTabContent'
import { PageHeader } from '@/components/PageHeader'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { BankFund, BudgetCategory, BudgetPayment } from '@/lib/types'

export function BudgetPage() {
  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ['budget'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as BudgetCategory[]
    },
  })

  const { data: payments = [], isLoading: paysLoading } = useQuery({
    queryKey: ['budget-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_payments')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as BudgetPayment[]
    },
  })

  const { data: bankFunds = [], isLoading: bankLoading } = useQuery({
    queryKey: ['bank-funds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_funds')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return data as BankFund[]
    },
  })

  const isBudgetLoading = catsLoading || paysLoading || bankLoading

  return (
    <div className="space-y-4">
      <PageHeader title="Budget" />

      <BudgetTabContent
        categories={categories}
        payments={payments}
        bankFunds={bankFunds}
        isLoading={isBudgetLoading}
      />
    </div>
  )
}
