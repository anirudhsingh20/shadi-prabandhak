import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Countdown } from '@/components/Countdown'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Button } from '@/components/ui/button'
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
import { Textarea } from '@/components/ui/textarea'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { decisionSchema, type DecisionInput } from '@/lib/validations'
import type { Decision } from '@/lib/types'

function DecisionForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm<DecisionInput>({
    resolver: zodResolver(decisionSchema),
    defaultValues: { decision_date: new Date().toISOString().slice(0, 10), text: '' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    const { error } = await supabase.from('decisions').insert({
      wedding_id: WEDDING_ID,
      decision_date: values.decision_date,
      text: values.text,
    })
    if (error) toast.error(error.message)
    else {
      toast.success('Decision added')
      form.reset({ decision_date: new Date().toISOString().slice(0, 10), text: '' })
      onSuccess()
    }
  })

  return (
    <Form {...form}>
      <form onSubmit={onSubmit} className="space-y-4">
        <FormField
          control={form.control}
          name="decision_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note</FormLabel>
              <FormControl>
                <Textarea rows={3} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : 'Add decision'}
        </Button>
      </form>
    </Form>
  )
}

export function HomePage() {
  const qc = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['decisions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decisions')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('decision_date', { ascending: false })
      if (error) throw error
      return data as Decision[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('decisions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['decisions'] })
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-8">
      <section>
        <p className="mt-1 text-xs text-white/85">Anjali & Anirudh · 20 November 2026</p>
        <div className="mt-1">
          <Countdown />
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold tracking-wide text-gold">Decision log</h2>
            <p className="text-base text-white/75">Notes on what you&apos;ve decided.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add decision</DialogTitle>
              </DialogHeader>
              <DecisionForm
                onSuccess={() => {
                  setDialogOpen(false)
                  qc.invalidateQueries({ queryKey: ['decisions'] })
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 divide-y divide-gold/25 rounded-md border border-gold/30 bg-white/5">
          {isLoading && <p className="p-4 text-sm text-white/70">Loading…</p>}
          {!isLoading && decisions.length === 0 && (
            <p className="p-4 text-sm text-white/70">No decisions yet.</p>
          )}
          {decisions.map((d) => (
            <div key={d.id} className="flex items-start justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-medium text-gold/85">{d.decision_date}</p>
                <p className="mt-1 text-base text-white">{d.text}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(d.id)}>
                <Trash2 className="h-4 w-4 text-white/70" />
              </Button>
            </div>
          ))}
        </div>
      </section>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete decision?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
