import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Badge } from '@/components/ui/badge'
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
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { eventSchema, type EventInput } from '@/lib/validations'
import type { Event } from '@/lib/types'

function EventForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<EventInput>
  onSubmit: (values: EventInput) => Promise<void>
  submitLabel: string
}) {
  const form = useForm<EventInput>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: '',
      event_date: '',
      time_label: '',
      venue: '',
      tag: '',
      sort_order: 0,
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="event_date" render={({ field }) => (
          <FormItem><FormLabel>Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="time_label" render={({ field }) => (
          <FormItem><FormLabel>Time</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="venue" render={({ field }) => (
          <FormItem><FormLabel>Venue / details</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="tag" render={({ field }) => (
          <FormItem><FormLabel>Tag</FormLabel><FormControl><Input placeholder="Day 1, Main…" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Form>
  )
}

export function EventsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*').eq('wedding_id', WEDDING_ID).order('sort_order')
      if (error) throw error
      return data as Event[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['events'] }); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async (values: EventInput, id?: string) => {
    const payload = { ...values, wedding_id: WEDDING_ID, time_label: values.time_label || null, venue: values.venue || null, tag: values.tag || null }
    const { error } = id
      ? await supabase.from('events').update(payload).eq('id', id)
      : await supabase.from('events').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Created')
    qc.invalidateQueries({ queryKey: ['events'] })
    setCreateOpen(false)
    setEditEvent(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Ceremony roadmap</h1>
          <p className="text-sm text-muted-foreground">Mehendi through Reception</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add</Button></DialogTrigger>
          <DialogContent><DialogHeader><DialogTitle>Add event</DialogTitle></DialogHeader>
            <EventForm submitLabel="Add event" onSubmit={(v) => save(v)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {events.map((e) => (
          <div key={e.id} className="flex flex-col gap-2 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{e.event_date}</p>
              <h2 className="font-semibold">{e.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{[e.time_label, e.venue].filter(Boolean).join(' · ')}</p>
            </div>
            <div className="flex items-center gap-2">
              {e.tag && <Badge variant="secondary">{e.tag}</Badge>}
              <Button variant="ghost" size="icon" onClick={() => setEditEvent(e)}><Pencil className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editEvent} onOpenChange={(o) => !o && setEditEvent(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit event</DialogTitle></DialogHeader>
          {editEvent && (
            <EventForm
              submitLabel="Save changes"
              defaultValues={{
                ...editEvent,
                time_label: editEvent.time_label ?? '',
                venue: editEvent.venue ?? '',
                tag: editEvent.tag ?? '',
              }}
              onSubmit={(v) => save(v, editEvent.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirm open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete event?" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  )
}
