import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { VendorBadge } from '@/components/StatusBadges'
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
import { Textarea } from '@/components/ui/textarea'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { vendorSchema, type VendorInput } from '@/lib/validations'
import type { Vendor } from '@/lib/types'

function VendorForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<VendorInput>
  onSubmit: (values: VendorInput) => Promise<void>
  submitLabel: string
}) {
  const form = useForm<VendorInput>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      type: '',
      name: '',
      phone: '',
      email: '',
      notes: '',
      status: 'shortlisted',
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Type</FormLabel><FormControl><Input placeholder="Photography, Catering…" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="phone" render={({ field }) => (
          <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="shortlisted">Shortlisted</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button>
      </form>
    </Form>
  )
}

export function VendorsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editVendor, setEditVendor] = useState<Vendor | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vendors').select('*').eq('wedding_id', WEDDING_ID).order('type')
      if (error) throw error
      return data as Vendor[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['vendors'] }); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async (values: VendorInput, id?: string) => {
    const payload = {
      ...values,
      wedding_id: WEDDING_ID,
      phone: values.phone || null,
      email: values.email || null,
      notes: values.notes || null,
    }
    const { error } = id
      ? await supabase.from('vendors').update(payload).eq('id', id)
      : await supabase.from('vendors').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Added')
    qc.invalidateQueries({ queryKey: ['vendors'] })
    setCreateOpen(false)
    setEditVendor(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendors"
        description="Contacts and booking status"
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add</Button></DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add vendor</DialogTitle></DialogHeader>
              <VendorForm submitLabel="Add vendor" onSubmit={(v) => save(v)} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-3">
        {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {vendors.map((v) => (
          <div key={v.id} className="rounded-md border p-4">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">{v.type}</p>
            <p className="mt-1 text-base font-semibold">{v.name}</p>
            {v.phone && <p className="mt-2 text-base text-muted-foreground">{v.phone}</p>}
            {v.email && <p className="text-base text-muted-foreground">{v.email}</p>}
            {v.notes && <p className="mt-1 text-sm text-muted-foreground">{v.notes}</p>}
            <div className="mt-3 flex items-center justify-between">
              <VendorBadge status={v.status} />
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEditVendor(v)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleteId(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!editVendor} onOpenChange={(o) => !o && setEditVendor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit vendor</DialogTitle></DialogHeader>
          {editVendor && <VendorForm submitLabel="Save changes" defaultValues={{ ...editVendor, email: editVendor.email ?? '', phone: editVendor.phone ?? '', notes: editVendor.notes ?? '' }} onSubmit={(vals) => save(vals, editVendor.id)} />}
        </DialogContent>
      </Dialog>

      <DeleteConfirm open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete vendor?" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  )
}
