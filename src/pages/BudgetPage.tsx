import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronRight, Wallet } from 'lucide-react'
import { BudgetTabContent } from '@/components/budget/BudgetTabContent'
import { BudgetDrawerShell, TotalBudgetForm } from '@/components/budget/shared'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { TotalBudgetInput } from '@/lib/validations'
import type { BudgetCategory, BudgetPayment, Wedding } from '@/lib/types'

export function BudgetPage() {
  const qc = useQueryClient()
  const [budgetOpen, setBudgetOpen] = useState(false)

  const { data: wedding } = useQuery({
    queryKey: ['wedding'],
    queryFn: async () => {
      const { data, error } = await supabase.from('weddings').select('*').eq('id', WEDDING_ID).single()
      if (error) throw error
      return data as Wedding
    },
  })

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

  const saveTotalBudget = async (values: TotalBudgetInput) => {
    const { error } = await supabase
      .from('weddings')
      .update({ total_budget: Number(values.total_budget) })
      .eq('id', WEDDING_ID)
    if (error) throw new Error(error.message)
    toast.success('Total budget updated')
    qc.invalidateQueries({ queryKey: ['wedding'] })
    setBudgetOpen(false)
  }

  const isBudgetLoading = catsLoading || paysLoading

  return (
    <div className="space-y-4">
      <PageHeader
        title="Budget"
        action={
          <Button size="sm" variant="outline" onClick={() => setBudgetOpen(true)}>
            Total
          </Button>
        }
      />

      <Link
        to="/money-in-bank"
        className="flex items-center justify-between gap-2 rounded-md border border-gold/35 bg-white/[0.03] px-3 py-2.5 transition-colors hover:border-gold/50 hover:bg-white/[0.05]"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-gold/80" />
          <span className="text-sm font-medium text-white/90">Money in bank</span>
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-white/35" />
      </Link>

      <BudgetTabContent
        wedding={wedding}
        categories={categories}
        payments={payments}
        isLoading={isBudgetLoading}
        onOpenTotalBudget={() => setBudgetOpen(true)}
      />

      <BudgetDrawerShell open={budgetOpen} onOpenChange={setBudgetOpen} title="Total budget">
        <TotalBudgetForm
          key={wedding?.total_budget ?? 0}
          defaultValue={Number(wedding?.total_budget) || 0}
          onSubmit={saveTotalBudget}
        />
      </BudgetDrawerShell>
    </div>
  )
}
