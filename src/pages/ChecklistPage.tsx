import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { ChecklistBadge } from '@/components/StatusBadges'
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
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { checklistItemSchema, type ChecklistItemInput } from '@/lib/validations'
import type { ChecklistItem, ChecklistStatus } from '@/lib/types'

function ChecklistForm({
  defaultValues,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<ChecklistItemInput>
  onSubmit: (values: ChecklistItemInput) => Promise<void>
  submitLabel: string
}) {
  const form = useForm<ChecklistItemInput>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      group_label: '',
      title: '',
      due_label: '',
      status: 'later',
      sort_order: 0,
      ...defaultValues,
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="group_label" render={({ field }) => (
          <FormItem><FormLabel>Group</FormLabel><FormControl><Input placeholder="July – August 2026" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Task</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="due_label" render={({ field }) => (
          <FormItem><FormLabel>Due</FormLabel><FormControl><Input placeholder="By Aug 2026" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="status" render={({ field }) => (
          <FormItem><FormLabel>Status</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="next">Next</SelectItem>
                <SelectItem value="later">Later</SelectItem>
              </SelectContent>
            </Select><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Saving…' : submitLabel}</Button>
      </form>
    </Form>
  )
}

export function ChecklistPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      const { data, error } = await supabase.from('checklist_items').select('*').eq('wedding_id', WEDDING_ID).order('sort_order')
      if (error) throw error
      return data as ChecklistItem[]
    },
  })

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    for (const item of items) {
      const list = map.get(item.group_label) ?? []
      list.push(item)
      map.set(item.group_label, list)
    }
    return map
  }, [items])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['checklist'] }); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ChecklistStatus }) => {
      const { error } = await supabase.from('checklist_items').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['checklist'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async (values: ChecklistItemInput, id?: string) => {
    const payload = { ...values, wedding_id: WEDDING_ID, due_label: values.due_label || null }
    const { error } = id
      ? await supabase.from('checklist_items').update(payload).eq('id', id)
      : await supabase.from('checklist_items').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Added')
    qc.invalidateQueries({ queryKey: ['checklist'] })
    setCreateOpen(false)
    setEditItem(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklist"
        description="Planning timeline until November"
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="mr-1 h-4 w-4" /> Add task</Button></DialogTrigger>
            <DialogContent><DialogHeader><DialogTitle>Add task</DialogTitle></DialogHeader>
              <ChecklistForm submitLabel="Add task" onSubmit={(v) => save(v)} />
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {[...grouped.entries()].map(([group, groupItems]) => (
        <section key={group}>
          <h2 className="mb-3 border-b border-gold/30 pb-2 font-display text-lg font-semibold text-gold">{group}</h2>
          <div className="divide-y rounded-md border">
            {groupItems.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 p-4">
                <div className={item.status === 'done' ? 'text-muted-foreground line-through' : ''}>
                  <p className="text-base font-semibold">{item.title}</p>
                  {item.due_label && <p className="text-sm text-muted-foreground">{item.due_label}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={item.status} onValueChange={(v) => statusMutation.mutate({ id: item.id, status: v as ChecklistStatus })}>
                    <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="next">Next</SelectItem>
                      <SelectItem value="later">Later</SelectItem>
                    </SelectContent>
                  </Select>
                  <ChecklistBadge status={item.status} />
                  <Button variant="ghost" size="icon" onClick={() => setEditItem(item)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent><DialogHeader><DialogTitle>Edit task</DialogTitle></DialogHeader>
          {editItem && (
            <ChecklistForm
              submitLabel="Save changes"
              defaultValues={{ ...editItem, due_label: editItem.due_label ?? '' }}
              onSubmit={(v) => save(v, editItem.id)}
            />
          )}
        </DialogContent>
      </Dialog>

      <DeleteConfirm open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)} title="Delete task?" onConfirm={() => deleteId && deleteMutation.mutate(deleteId)} loading={deleteMutation.isPending} />
    </div>
  )
}
