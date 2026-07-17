import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Plus, Settings2, Trash2, X } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { HeadcountBadge, RsvpBadge, SideIcon } from '@/components/StatusBadges'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { guestSchema, type GuestInput } from '@/lib/validations'
import type { Event, Guest, GuestSide, RsvpStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

const SIDE_STORAGE_KEY = 'shadi-guest-default-side'
const SORT_STORAGE_KEY = 'shadi-guest-sort'

type GuestSort = 'created_desc' | 'created_asc' | 'updated_desc' | 'updated_asc' | 'count_desc' | 'count_asc'

function getStoredSort(): GuestSort {
  try {
    const v = localStorage.getItem(SORT_STORAGE_KEY)
    if (
      v === 'created_desc' ||
      v === 'created_asc' ||
      v === 'updated_desc' ||
      v === 'updated_asc' ||
      v === 'count_desc' ||
      v === 'count_asc'
    ) {
      return v
    }
  } catch {
    /* ignore */
  }
  return 'created_desc'
}

function setStoredSort(sort: GuestSort) {
  try {
    localStorage.setItem(SORT_STORAGE_KEY, sort)
  } catch {
    /* ignore */
  }
}

function timeMs(value: string | null | undefined) {
  if (!value) return 0
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

function getStoredSide(): GuestSide {
  try {
    const v = localStorage.getItem(SIDE_STORAGE_KEY)
    if (v === 'bride' || v === 'groom' || v === 'common') return v
  } catch {
    /* ignore */
  }
  return 'bride'
}

function setStoredSide(side: GuestSide) {
  try {
    localStorage.setItem(SIDE_STORAGE_KEY, side)
  } catch {
    /* ignore */
  }
}

function pax(g: Pick<Guest, 'headcount'>) {
  return Math.max(1, Number(g.headcount) || 1)
}

function nameInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0 && !/^(and|or|of|the|&|\/)$/i.test(w))
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function GuestAvatar({ name }: { name: string }) {
  return (
    <div
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gold/40 bg-white/10 text-sm font-semibold text-gold"
      aria-hidden
    >
      {nameInitials(name)}
    </div>
  )
}

/** Parse "Name, 2" — last comma-separated token used as count when numeric */
function parseQuickEntry(raw: string): { name: string; headcount: number } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  const lastComma = trimmed.lastIndexOf(',')
  if (lastComma === -1) {
    if (trimmed.length < 2) return null
    return { name: trimmed, headcount: 1 }
  }

  const maybeCount = trimmed.slice(lastComma + 1).trim()
  const namePart = trimmed.slice(0, lastComma).trim()
  if (/^\d{1,2}$/.test(maybeCount) && namePart.length >= 2) {
    const n = Number(maybeCount)
    if (n >= 1 && n <= 99) return { name: namePart, headcount: n }
  }

  if (trimmed.length < 2) return null
  return { name: trimmed, headcount: 1 }
}

function parseSelectedEvents(stored: string | null | undefined, eventNames: string[]): string[] {
  if (!stored?.trim()) return []
  const parts = stored.split(',').map((s) => s.trim()).filter(Boolean)
  if (parts.some((p) => /^all$/i.test(p))) return [...eventNames]
  return eventNames.filter((name) =>
    parts.some(
      (p) =>
        name === p ||
        name.toLowerCase().startsWith(p.toLowerCase()) ||
        p.toLowerCase().startsWith(name.toLowerCase().split(/\s+/)[0] ?? ''),
    ),
  )
}

function SideChip({
  side,
  label,
  active,
  onClick,
}: {
  side: GuestSide
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors',
        active
          ? 'border-transparent bg-gold text-gold-foreground'
          : 'border-gold/35 bg-white/5 text-white hover:bg-white/10 hover:text-gold',
      )}
    >
      <SideIcon side={side} className="h-5 w-5" />
      {label}
    </button>
  )
}

function GuestForm({
  defaultValues,
  eventNames,
  onSubmit,
  submitLabel,
}: {
  defaultValues?: Partial<GuestInput>
  eventNames: string[]
  onSubmit: (values: GuestInput) => Promise<void>
  submitLabel: string
}) {
  const form = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: {
      name: '',
      side: getStoredSide(),
      rsvp_status: 'confirmed',
      headcount: 1,
      events_attending: '',
      notes: '',
      ...defaultValues,
    },
  })

  const selectedEvents = parseSelectedEvents(form.watch('events_attending'), eventNames)
  const allSelected = eventNames.length > 0 && selectedEvents.length === eventNames.length

  const setEvents = (names: string[]) => {
    form.setValue('events_attending', names.join(', '), { shouldDirty: true, shouldValidate: true })
  }

  const toggleEvent = (name: string) => {
    if (selectedEvents.includes(name)) {
      setEvents(selectedEvents.filter((n) => n !== name))
    } else {
      setEvents([...selectedEvents, name])
    }
  }

  const toggleAll = () => {
    setEvents(allSelected ? [] : [...eventNames])
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="side" render={({ field }) => (
          <FormItem>
            <FormLabel>Side</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="bride">Bride</SelectItem>
                <SelectItem value="groom">Groom</SelectItem>
                <SelectItem value="common">Common</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="rsvp_status" render={({ field }) => (
          <FormItem>
            <FormLabel>RSVP</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="headcount" render={({ field }) => (
          <FormItem>
            <FormLabel>Count</FormLabel>
            <FormControl><Input type="number" min={1} max={99} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="events_attending" render={() => (
          <FormItem>
            <FormLabel>Events</FormLabel>
            {eventNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet. Add them under Events first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={toggleAll}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                    allSelected
                      ? 'border-transparent bg-gold text-gold-foreground'
                      : 'border-gold/35 bg-white/5 text-white hover:bg-white/10',
                  )}
                >
                  All
                </button>
                {eventNames.map((name) => {
                  const active = selectedEvents.includes(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleEvent(name)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors',
                        active
                          ? 'border-transparent bg-gold text-gold-foreground'
                          : 'border-gold/35 bg-white/5 text-white hover:bg-white/10',
                      )}
                    >
                      {name}
                    </button>
                  )
                })}
              </div>
            )}
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="notes" render={({ field }) => (
          <FormItem>
            <FormLabel>Notes</FormLabel>
            <FormControl><Textarea rows={2} {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving…' : submitLabel}
        </Button>
      </form>
    </Form>
  )
}

export function GuestsPage() {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [quickSide, setQuickSide] = useState<GuestSide>(() => getStoredSide())
  const [quickSaving, setQuickSaving] = useState(false)
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [sideFilter, setSideFilter] = useState<'all' | GuestSide>('all')
  const [rsvpFilter, setRsvpFilter] = useState<'all' | RsvpStatus>('all')
  const [sortBy, setSortBy] = useState<GuestSort>(() => getStoredSort())

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guests').select('*').eq('wedding_id', WEDDING_ID)
      if (error) throw error
      return data as Guest[]
    },
  })

  const { data: events = [] } = useQuery({
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

  const eventNames = useMemo(() => events.map((e) => e.name), [events])

  const counts = useMemo(() => {
    let bride = 0
    let groom = 0
    let common = 0
    let together = 0
    for (const g of guests) {
      const n = pax(g)
      together += n
      if (g.side === 'bride') bride += n
      else if (g.side === 'groom') groom += n
      else if (g.side === 'common') common += n
    }
    return { bride, groom, common, together }
  }, [guests])

  const filtered = useMemo(() => {
    const list = guests.filter((g) => {
      if (sideFilter !== 'all' && g.side !== sideFilter) return false
      if (rsvpFilter !== 'all' && g.rsvp_status !== rsvpFilter) return false
      return true
    })

    list.sort((a, b) => {
      switch (sortBy) {
        case 'created_asc':
          return timeMs(a.created_at) - timeMs(b.created_at)
        case 'created_desc':
          return timeMs(b.created_at) - timeMs(a.created_at)
        case 'updated_asc':
          return timeMs(a.updated_at) - timeMs(b.updated_at)
        case 'updated_desc':
          return timeMs(b.updated_at) - timeMs(a.updated_at)
        case 'count_asc':
          return pax(a) - pax(b)
        case 'count_desc':
          return pax(b) - pax(a)
        default:
          return 0
      }
    })

    return list
  }, [guests, sideFilter, rsvpFilter, sortBy])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['guests'] }); setDeleteId(null) },
    onError: (e: Error) => toast.error(e.message),
  })

  const save = async (values: GuestInput, id?: string) => {
    setStoredSide(values.side)
    setQuickSide(values.side)
    const payload = {
      name: values.name,
      side: values.side,
      rsvp_status: values.rsvp_status,
      headcount: values.headcount,
      wedding_id: WEDDING_ID,
      events_attending: values.events_attending || null,
      notes: values.notes || null,
    }
    const { error } = id
      ? await supabase.from('guests').update(payload).eq('id', id)
      : await supabase.from('guests').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Added')
    qc.invalidateQueries({ queryKey: ['guests'] })
    setCustomizeOpen(false)
    setEditGuest(null)
    if (!id) setQuickText('')
  }

  const quickAdd = async () => {
    const parsed = parseQuickEntry(quickText)
    if (!parsed) {
      toast.error('Enter a name (e.g. Rajesh Sharma, 2)')
      return
    }
    setQuickSaving(true)
    try {
      await save({
        name: parsed.name,
        side: quickSide,
        rsvp_status: 'confirmed',
        headcount: parsed.headcount,
        events_attending: eventNames.length ? 'All' : '',
        notes: '',
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add')
    } finally {
      setQuickSaving(false)
    }
  }

  const customizeDefaults = (): Partial<GuestInput> => {
    const parsed = parseQuickEntry(quickText)
    return {
      name: parsed?.name ?? '',
      headcount: parsed?.headcount ?? 1,
      side: quickSide,
      rsvp_status: 'confirmed',
      events_attending: '',
      notes: '',
    }
  }

  const openAdd = () => {
    setQuickSide(getStoredSide())
    setAdding(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest list"
        description="RSVP tracker for both families"
        action={
          adding ? (
            <Button size="sm" variant="outline" onClick={() => setAdding(false)}>
              <X className="mr-1 h-4 w-4" /> Close
            </Button>
          ) : (
            <Button size="sm" onClick={openAdd}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          )
        }
      />

      {adding && (
        <section className="space-y-3 rounded-md border p-3">
          <p className="text-sm font-medium">Add guest</p>
          <p className="text-xs text-muted-foreground">Format: Name, count — e.g. Rajesh Sharma, 2</p>
          <div className="flex gap-2">
            <Input
              autoFocus
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void quickAdd()
                }
              }}
              placeholder="Name, count"
              className="flex-1"
            />
            <Button type="button" onClick={() => void quickAdd()} disabled={quickSaving}>
              {quickSaving ? '…' : 'Add'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SideChip side="bride" label="Bride" active={quickSide === 'bride'} onClick={() => setQuickSide('bride')} />
            <SideChip side="groom" label="Groom" active={quickSide === 'groom'} onClick={() => setQuickSide('groom')} />
            <SideChip side="common" label="Common" active={quickSide === 'common'} onClick={() => setQuickSide('common')} />
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Customize
            </button>
          </div>
        </section>
      )}

      {!adding && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSideFilter('all')}
              className={`rounded-md border p-3 text-left transition-colors ${sideFilter === 'all' ? 'border-gold bg-gold/15' : 'border-gold/30 hover:bg-white/10'}`}
            >
              <p className="text-sm text-white/75">Total</p>
              <p className="font-display text-3xl font-semibold text-gold">{counts.together}</p>
            </button>
            <button
              type="button"
              onClick={() => setSideFilter('common')}
              className={`rounded-md border p-3 text-left transition-colors ${sideFilter === 'common' ? 'border-gold bg-gold/15' : 'border-gold/30 hover:bg-white/10'}`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <SideIcon side="common" className="h-6 w-6" />
                <p className="text-sm text-white/75">Common</p>
              </div>
              <p className="font-display text-3xl font-semibold text-white">{counts.common}</p>
            </button>
            <button
              type="button"
              onClick={() => setSideFilter('bride')}
              className={`rounded-md border p-3 text-left transition-colors ${sideFilter === 'bride' ? 'border-gold bg-gold/15' : 'border-gold/30 hover:bg-white/10'}`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <SideIcon side="bride" className="h-6 w-6" />
                <p className="text-sm text-white/75">Bride</p>
              </div>
              <p className="font-display text-3xl font-semibold text-white">{counts.bride}</p>
            </button>
            <button
              type="button"
              onClick={() => setSideFilter('groom')}
              className={`rounded-md border p-3 text-left transition-colors ${sideFilter === 'groom' ? 'border-gold bg-gold/15' : 'border-gold/30 hover:bg-white/10'}`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <SideIcon side="groom" className="h-6 w-6" />
                <p className="text-sm text-white/75">Groom</p>
              </div>
              <p className="font-display text-3xl font-semibold text-white">{counts.groom}</p>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={sideFilter} onValueChange={(v) => setSideFilter(v as typeof sideFilter)}>
              <SelectTrigger><SelectValue placeholder="Side" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sides</SelectItem>
                <SelectItem value="bride">Bride</SelectItem>
                <SelectItem value="groom">Groom</SelectItem>
                <SelectItem value="common">Common</SelectItem>
              </SelectContent>
            </Select>
            <Select value={rsvpFilter} onValueChange={(v) => setRsvpFilter(v as typeof rsvpFilter)}>
              <SelectTrigger><SelectValue placeholder="RSVP" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All RSVP</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Select
            value={sortBy}
            onValueChange={(v) => {
              const next = v as GuestSort
              setSortBy(next)
              setStoredSort(next)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_desc">Newest created</SelectItem>
              <SelectItem value="created_asc">Oldest created</SelectItem>
              <SelectItem value="updated_desc">Recently modified</SelectItem>
              <SelectItem value="updated_asc">Least recently modified</SelectItem>
              <SelectItem value="count_desc">Highest count</SelectItem>
              <SelectItem value="count_asc">Lowest count</SelectItem>
            </SelectContent>
          </Select>

          <div className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!isLoading && filtered.length === 0 && (
              <p className="text-sm text-muted-foreground">No guests match these filters.</p>
            )}
            {filtered.map((g) => {
              const eventsLabel =
                g.events_attending?.trim() === 'All' || /^all$/i.test(g.events_attending?.trim() ?? '')
                  ? 'All events'
                  : g.events_attending?.trim() || null
              return (
                <div key={g.id} className="flex items-start gap-2 rounded-md border border-gold/30 bg-white/5 px-3 py-2.5">
                  <GuestAvatar name={g.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <p className="truncate text-base font-semibold">{g.name}</p>
                      <SideIcon side={g.side} className="h-6 w-6" />
                      <HeadcountBadge count={pax(g)} />
                      <RsvpBadge status={g.rsvp_status} iconOnly />
                    </div>
                    {eventsLabel && (
                      <p className="mt-1 truncate text-sm text-muted-foreground">{eventsLabel}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-0.5">
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setEditGuest(g)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setDeleteId(g.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Customize guest</DialogTitle></DialogHeader>
          {customizeOpen && (
            <GuestForm
              key={`customize-${quickSide}-${quickText}`}
              eventNames={eventNames}
              defaultValues={customizeDefaults()}
              submitLabel="Add guest"
              onSubmit={(v) => save(v)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editGuest} onOpenChange={(o) => !o && setEditGuest(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit guest</DialogTitle></DialogHeader>
          {editGuest && (
            <GuestForm
              key={editGuest.id}
              eventNames={eventNames}
              submitLabel="Save changes"
              defaultValues={{
                name: editGuest.name,
                side: editGuest.side,
                rsvp_status: editGuest.rsvp_status,
                headcount: pax(editGuest),
                events_attending: parseSelectedEvents(editGuest.events_attending, eventNames).join(', '),
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
