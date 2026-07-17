import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { budgetCategorySchema, type BudgetCategoryInput } from '@/lib/validations'
import type { BudgetCategory } from '@/lib/types'

function BudgetForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<BudgetCategoryInput>
  onSubmit: (values: BudgetCategoryInput) => Promise<void>
  submitLabel: string
}) {
  const form = useForm<BudgetCategoryInput>({
    resolver: zodResolver(budgetCategorySchema),
    defaultValues: { name: '', allocated: 0, spent: 0, sort_order: 0, ...defaultValues },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Category</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="allocated" render={({ field }) => (
          <FormItem><FormLabel>Allocated (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="spent" render={({ field }) => (
          <FormItem><FormLabel>Spent (₹)</FormLabel><FormControl><Input type="number" min={0} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button>
      </form>
    </Form>
  )
}

export function BudgetPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<BudgetCategory | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['budget'],
    queryFn: async () => {
      const { data, error } = await supabase.from('budget_categories').select('*').eq('wedding_id', WEDDING_ID).order('sort_order')
      if (error) throw error
      return data as BudgetCategory[]
    },
  })

  const totals = useMemo(() => {
    const allocated = categories.reduce((s, c) => s + Number(c.allocated), 0)
    const spent = categories.reduce((s, c) => s + Number(c.spent), 0)
    return { allocated, spent, remaining: allocated - spent }
  }, [categories])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('budget_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['budget'] }); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async (values: BudgetCategoryInput, id?: string) => {
    const payload = { ...values, wedding_id: WEDDING_ID, allocated: Number(values.allocated), spent: Number(values.spent) }
    const { error } = id
      ? await supabase.from('budget_categories').update(payload).eq('id', id)
      : await supabase.from('budget_categories').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Added')
    qc.invalidateQueries({ queryKey: ['budget'] })
    setCreateOpen(false)
    setEditItem(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Budget</h1>
          <p className="text-sm text-muted-foreground">Track spend by category</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Add category</DialogTitle></DialogHeader>
            <BudgetForm submitLabel="Add category" onSubmit={(v) => save(v)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total budget</p><p className="text-xl font-semibold">{formatCurrency(totals.allocated)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Spent</p><p className="text-xl font-semibold">{formatCurrency(totals.spent)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Remaining</p><p className="text-xl font-semibold">{formatCurrency(totals.remaining)}</p></CardContent></Card>
      </div>

      <div className="space-y-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {categories.map((c) => {
          const pct = Number(c.allocated) > 0 ? Math.min(100, (Number(c.spent) / Number(c.allocated)) * 100) : 0
          return (
            <div key={c.id} className="rounded-md border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{formatCurrency(Number(c.spent))} / {formatCurrency(Number(c.allocated))}</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setEditItem(c)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              <Progress value={pct} className="mt-3 h-2" />
            </div>
          )
        })}
      </div>

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit category</DialogTitle></DialogHeader>
          {editItem && <BudgetForm submitLabel="Save changes" defaultValues={{ ...editItem, allocated: Number(editItem.allocated), spent: Number(editItem.spent) }} onSubmit={(v) => save(v, editItem.id)} />}
        </DialogContent>
      </Dialog>

      <DeleteConfirm open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete category?" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  )
}
