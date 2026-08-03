import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Wallet } from 'lucide-react'
import { BudgetTabContent } from '@/components/budget/BudgetTabContent'
import { MoneyInBankTabContent } from '@/components/budget/MoneyInBankTabContent'
import { BudgetDrawerShell, TotalBudgetForm } from '@/components/budget/shared'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { TotalBudgetInput } from '@/lib/validations'
import type { BankFund, BudgetCategory, BudgetPayment, Wedding } from '@/lib/types'

type MainTab = 'budget' | 'bank'

export function BudgetPage() {
  const qc = useQueryClient()
  const [mainTab, setMainTab] = useState<MainTab>('budget')
  const [budgetOpen, setBudgetOpen] = useState(false)
  const [fundCreateOpen, setFundCreateOpen] = useState(false)

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
          mainTab === 'budget' ? (
            <Button size="sm" variant="outline" onClick={() => setBudgetOpen(true)}>
              Total
            </Button>
          ) : (
            <Button size="sm" onClick={() => setFundCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add money
            </Button>
          )
        }
      />

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid h-auto w-full grid-cols-2 p-0.5">
          <TabsTrigger value="budget" className="px-2 py-1.5 text-xs">
            Budget
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center justify-center gap-1 px-2 py-1.5 text-xs">
            <Wallet className="h-3.5 w-3.5" />
            Money in bank
          </TabsTrigger>
        </TabsList>

        <TabsContent value="budget" className="mt-3">
          <BudgetTabContent
            wedding={wedding}
            categories={categories}
            payments={payments}
            isLoading={isBudgetLoading}
            onOpenTotalBudget={() => setBudgetOpen(true)}
          />
        </TabsContent>

        <TabsContent value="bank" className="mt-3">
          <MoneyInBankTabContent
            funds={bankFunds}
            payments={payments}
            isLoading={fundsLoading}
            createOpen={fundCreateOpen}
            onCreateOpenChange={setFundCreateOpen}
          />
        </TabsContent>
      </Tabs>

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
