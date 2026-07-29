import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CalendarDays, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { eventSchema, type EventInput } from '@/lib/validations'
import type { Event } from '@/lib/types'

function formatEventDate(value: string) {
  const d = new Date(`${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function formatEventDateLong(value: string) {
  const d = new Date(`${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function EventDateField({
  value,
  onChange,
  onBlur,
  name,
}: {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const label = value ? formatEventDateLong(value) : null

  const openPicker = () => {
    const el = inputRef.current
    if (!el) return
    if (typeof el.showPicker === 'function') el.showPicker()
    else el.click()
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="date"
        name={name}
        value={value || ''}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        onClick={openPicker}
        className={cn(
          'inline-flex h-8 max-w-full items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors',
          value
            ? 'border-gold/40 bg-gold/10 text-gold'
            : 'border-gold/20 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]',
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label ?? 'Pick date'}</span>
      </button>
    </div>
  )
}

function EventDrawerShell({
  open,
  onOpenChange,
  title,
  children,
  footer,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      dismissible={false}
      shouldScaleBackground={false}
      repositionInputs={false}
      fixed
    >
      <DrawerContent className="max-h-[min(88dvh,640px)] overflow-hidden">
        <DrawerHeader className="relative shrink-0 pr-10 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1 h-9 w-9 text-white/70 hover:text-gold"
            aria-label="Close"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </DrawerHeader>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-2 [touch-action:pan-y]">
          {children}
        </div>
        {footer ? (
          <DrawerFooter className="shrink-0 border-t border-gold/20">{footer}</DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function EventForm({
  formId,
  defaultValues,
  onSubmit,
  onSubmittingChange,
}: {
  formId: string
  defaultValues?: Partial<EventInput>
  onSubmit: (values: EventInput) => Promise<void>
  onSubmittingChange?: (submitting: boolean) => void
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

  useEffect(() => {
    onSubmittingChange?.(form.formState.isSubmitting)
  }, [form.formState.isSubmitting, onSubmittingChange])

  return (
    <Form {...form}>
      <form
        id={formId}
        onSubmit={form.handleSubmit(async (values) => {
          await onSubmit(values)
        })}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Name
              </p>
              <FormControl>
                <Input
                  autoFocus
                  placeholder="e.g. Mehendi"
                  className="h-auto border-0 border-b border-gold/30 bg-transparent px-0 py-1.5 text-base shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="event_date"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Date
              </p>
              <FormControl>
                <EventDateField
                  name={field.name}
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="time_label"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Time <span className="normal-case tracking-normal text-white/30">(optional)</span>
              </p>
              <FormControl>
                <Input
                  placeholder="e.g. 4:00 PM"
                  className="h-auto border-0 border-b border-gold/30 bg-transparent px-0 py-1.5 text-sm shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="venue"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Venue <span className="normal-case tracking-normal text-white/30">(optional)</span>
              </p>
              <FormControl>
                <Input
                  placeholder="Where?"
                  className="h-auto border-0 border-b border-gold/30 bg-transparent px-0 py-1.5 text-sm shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="tag"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Tag <span className="normal-case tracking-normal text-white/30">(optional)</span>
              </p>
              <FormControl>
                <Input
                  placeholder="Day 1, Main…"
                  className="h-auto border-0 border-b border-gold/30 bg-transparent px-0 py-1.5 text-sm shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  )
}

export function EventsPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<Event | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as Event[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['events'] })
      setDeleteId(null)
      setEditEvent(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async (values: EventInput, id?: string) => {
    const sort_order =
      id != null
        ? values.sort_order
        : events.length > 0
          ? Math.max(...events.map((e) => e.sort_order)) + 1
          : 0
    const payload = {
      name: values.name.trim(),
      event_date: values.event_date,
      time_label: values.time_label?.trim() || null,
      venue: values.venue?.trim() || null,
      tag: values.tag?.trim() || null,
      sort_order,
      wedding_id: WEDDING_ID,
    }
    const { error } = id
      ? await supabase.from('events').update(payload).eq('id', id)
      : await supabase.from('events').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Added')
    qc.invalidateQueries({ queryKey: ['events'] })
    setCreateOpen(false)
    setEditEvent(null)
  }

  return (
    <div className="space-y-3">
      <PageHeader
        title="Events"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        }
      />

      {isLoading ? (
        <p className="py-1 text-[13px] text-white/45">Loading…</p>
      ) : events.length === 0 ? (
        <p className="py-1 text-[13px] text-white/45">No events yet.</p>
      ) : (
        <div className="relative pl-3.5">
          <div
            className="absolute bottom-1 left-[4px] top-1 w-px bg-gold/20"
            aria-hidden
          />
          <ul>
            {events.map((e, index) => {
              const meta = [e.time_label, e.venue, e.tag].filter(Boolean).join(' · ')
              return (
                <li key={e.id} className="group relative">
                  <span
                    className="absolute -left-3.5 top-2.5 h-2 w-2 rounded-full bg-gold/70 ring-4 ring-gold/15"
                    aria-hidden
                  />
                  <div
                    className={cn(
                      'flex items-start gap-1 rounded-md py-1.5 pl-1 pr-0.5 hover:bg-white/[0.04]',
                      index < events.length - 1 && 'border-b border-white/[0.04]',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setEditEvent(e)}
                      className="flex min-w-0 flex-1 items-start gap-1 text-left"
                    >
                      <span className="w-9 shrink-0 pt-px text-[10px] font-medium tabular-nums leading-snug text-white/40">
                        {formatEventDate(e.event_date)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium leading-snug text-white/90">
                          {e.name}
                        </p>
                        {meta ? (
                          <p className="mt-0.5 truncate text-[10px] leading-snug text-white/40">
                            {meta}
                          </p>
                        ) : null}
                      </div>
                    </button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                          aria-label="Event actions"
                        >
                          <MoreHorizontal className="h-4 w-4 text-white/55" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={() => setEditEvent(e)}>
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteId(e.id)}
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <EventDrawerShell
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setFormSubmitting(false)
        }}
        title="Add event"
        footer={
          <Button
            type="submit"
            form="event-form-create"
            className="h-9 w-full text-sm"
            disabled={formSubmitting}
          >
            {formSubmitting ? 'Saving…' : 'Add event'}
          </Button>
        }
      >
        <EventForm
          key={createOpen ? 'create-open' : 'create-closed'}
          formId="event-form-create"
          onSubmittingChange={setFormSubmitting}
          onSubmit={async (v) => {
            try {
              await save(v)
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'Failed to save')
              throw err
            }
          }}
        />
      </EventDrawerShell>

      <EventDrawerShell
        open={!!editEvent}
        onOpenChange={(open) => {
          if (!open) {
            setEditEvent(null)
            setFormSubmitting(false)
          }
        }}
        title="Edit event"
        footer={
          editEvent ? (
            <div className="flex w-full gap-2">
              <Button
                type="submit"
                form="event-form-edit"
                className="h-9 flex-1 text-sm"
                disabled={formSubmitting}
              >
                {formSubmitting ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(editEvent.id)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      >
        {editEvent ? (
          <EventForm
            key={editEvent.id}
            formId="event-form-edit"
            defaultValues={{
              name: editEvent.name,
              event_date: editEvent.event_date,
              time_label: editEvent.time_label ?? '',
              venue: editEvent.venue ?? '',
              tag: editEvent.tag ?? '',
              sort_order: editEvent.sort_order,
            }}
            onSubmittingChange={setFormSubmitting}
            onSubmit={async (v) => {
              try {
                await save(v, editEvent.id)
              } catch (err) {
                toast.error(err instanceof Error ? err.message : 'Failed to save')
                throw err
              }
            }}
          />
        ) : null}
      </EventDrawerShell>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete event?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
