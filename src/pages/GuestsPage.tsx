import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { RsvpBadge, SideBadge } from '@/components/StatusBadges'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { guestSchema, type GuestInput } from '@/lib/validations'
import type { Guest, GuestSide, RsvpStatus } from '@/lib/types'

function GuestForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<GuestInput>
  onSubmit: (values: GuestInput) => Promise<void>
  submitLabel: string
}) {
  const form = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: '',
      side: 'bride',
      rsvp_status: 'pending',
      events_attending: '',
      dietary: '',
      notes: '',
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="side" render={({ field }) => (
          <FormItem><FormLabel>Side</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="bride">Bride</SelectItem>
                <SelectItem value="groom">Groom</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="rsvp_status" render={({ field }) => (
          <FormItem><FormLabel>RSVP</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="events_attending" render={({ field }) => (
          <FormItem><FormLabel>Events</FormLabel><FormControl><Input placeholder="All, Wedding…" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="dietary" render={({ field }) => (
          <FormItem><FormLabel>Dietary</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button>
      </form>
    </Form>
  )
}

export function GuestsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sideFilter, setSideFilter] = useState<'all' | GuestSide>('all')
  const [rsvpFilter, setRsvpFilter] = useState<'all' | RsvpStatus>('all')

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guests').select('*').eq('wedding_id', WEDDING_ID).order('name')
      if (error) throw error
      return data as Guest[]
    },
  })

  const filtered = useMemo(() => guests.filter((g) => {
    if (sideFilter !== 'all' && g.side !== sideFilter) return false
    if (rsvpFilter !== 'all' && g.rsvp_status !== rsvpFilter) return false
    return true
  }), [guests, sideFilter, rsvpFilter])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['guests'] }); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async (values: GuestInput, id?: string) => {
    const payload = {
      ...values,
      wedding_id: WEDDING_ID,
      events_attending: values.events_attending || null,
      dietary: values.dietary || null,
      notes: values.notes || null,
    }
    const { error } = id
      ? await supabase.from('guests').update(payload).eq('id', id)
      : await supabase.from('guests').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Added')
    qc.invalidateQueries({ queryKey: ['guests'] })
    setCreateOpen(false)
    setEditGuest(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Guest list</h1>
          <p className="text-sm text-muted-foreground">RSVP tracker for both families</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add guest</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add guest</DialogTitle></DialogHeader>
            <GuestForm submitLabel="Add guest" onSubmit={(v) => save(v)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap gap-2">
        <Select value={sideFilter} onValueChange={(v) => setSideFilter(v as typeof sideFilter)}>
          <SelectTrigger className="w-32"><SelectValue placeholder="Side" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sides</SelectItem>
            <SelectItem value="bride">Bride</SelectItem>
            <SelectItem value="groom">Groom</SelectItem>
          </SelectContent>
        </Select>
        <Select value={rsvpFilter} onValueChange={(v) => setRsvpFilter(v as typeof rsvpFilter)}>
          <SelectTrigger className="w-36"><SelectValue placeholder="RSVP" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All RSVP</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {filtered.map((g) => (
          <div key={g.id} className="rounded-md border p-4">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{g.name}</p>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditGuest(g)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Side</dt><dd><SideBadge side={g.side} /></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">RSVP</dt><dd><RsvpBadge status={g.rsvp_status} /></dd></div>
              {g.events_attending && <div className="flex justify-between"><dt className="text-muted-foreground">Events</dt><dd>{g.events_attending}</dd></div>}
              {g.dietary && <div className="flex justify-between"><dt className="text-muted-foreground">Dietary</dt><dd>{g.dietary}</dd></div>}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>RSVP</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Dietary</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell><SideBadge side={g.side} /></TableCell>
                <TableCell><RsvpBadge status={g.rsvp_status} /></TableCell>
                <TableCell>{g.events_attending ?? '—'}</TableCell>
                <TableCell>{g.dietary ?? '—'}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditGuest(g)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editGuest} onOpenChange={(o) => !o && setEditGuest(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit guest</DialogTitle></DialogHeader>
          {editGuest && (
            <GuestForm
              submitLabel="Save changes"
              defaultValues={{
                ...editGuest,
                events_attending: editGuest.events_attending ?? '',
                dietary: editGuest.dietary ?? '',
                notes: editGuest.notes ?? '',
              }}
              onSubmit={(v) => save(v, editGuest.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirm open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete guest?" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  )
}
