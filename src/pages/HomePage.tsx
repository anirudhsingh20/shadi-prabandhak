import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import { Countdown } from '@/components/Countdown'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

const links = [
  { to: '/events', title: 'Events', desc: 'Mehendi, Haldi, Sangeet, Wedding & Reception' },
  { to: '/guests', title: 'Guests', desc: 'Bride, groom & common · RSVP counts' },
  { to: '/budget', title: 'Budget', desc: 'Bank balance, categories & charts' },
  { to: '/tracker', title: 'Tracker', desc: 'Payments — done, pending, may come' },
  { to: '/vendors', title: 'Vendors', desc: 'Contacts and booking status' },
  { to: '/checklist', title: 'Checklist', desc: 'Timeline until November' },
  { to: '/ideas', title: 'Ideas', desc: 'tldraw whiteboard for wedding ideas' },
]

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
        <h1 className="font-display text-4xl font-semibold tracking-wide text-gold">Shadi Prabandhak</h1>
        <p className="mt-2 text-lg text-white/85">Anjali & Anirudh · 20 November 2026</p>
        <div className="mt-6">
          <Countdown />
        </div>
      </section>

      <section>
        <h2 className="font-display text-2xl font-semibold tracking-wide text-gold">Overview</h2>
        <p className="mt-1 text-base text-white/75">Guests, budget, vendors, and ceremony schedule.</p>
        <div className="mt-4 grid gap-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to}>
              <Card className="border-gold/30 bg-white/5 transition-colors hover:bg-gold/10">
                <CardHeader className="p-4">
                  <CardTitle className="text-base text-white">{l.title}</CardTitle>
                  <CardDescription className="text-sm text-white/70">{l.desc}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
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