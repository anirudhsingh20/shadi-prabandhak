import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { MoneyInBankTabContent } from '@/components/budget/MoneyInBankTabContent'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { BankFund, BudgetPayment } from '@/lib/types'

export function MoneyInBankPage() {
  const [fundCreateOpen, setFundCreateOpen] = useState(false)

  const { data: bankFunds = [], isLoading: fundsLoading } = useQuery({
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

  const { data: payments = [] } = useQuery({
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Money in bank"
        action={
          <Button size="sm" onClick={() => setFundCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add money
          </Button>
        }
      />

      <MoneyInBankTabContent
        funds={bankFunds}
        payments={payments}
        isLoading={fundsLoading}
        createOpen={fundCreateOpen}
        onCreateOpenChange={setFundCreateOpen}
      />
    </div>
  )
}
