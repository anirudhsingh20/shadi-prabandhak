import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Minus, Pencil, Plus, Trash2, X } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { Event, Guest, GuestRelation, GuestSide } from '@/lib/types'
import { cn } from '@/lib/utils'

type SideTab = 'all' | GuestSide

const SIDE_CHIPS: { value: GuestSide; label: string }[] = [
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
  { value: 'common', label: 'Mutual' },
]

const RELATION_CHIPS: { value: GuestRelation; label: string }[] = [
  { value: 'father', label: 'Father' },
  { value: 'mother', label: 'Mother' },
  { value: 'friends', label: 'Friends' },
  { value: 'other', label: 'Other' },
]

const RELATION_LABEL: Record<GuestRelation, string> = {
  father: 'Father',
  mother: 'Mother',
  friends: 'Friends',
  other: 'Other',
}

const SIDE_LABEL: Record<GuestSide, string> = {
  bride: 'Bride',
  groom: 'Groom',
  common: 'Mutual',
}

const FILTER_TABS: { value: SideTab; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bride', label: 'Bride' },
  { value: 'groom', label: 'Groom' },
  { value: 'common', label: 'Mutual' },
]

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

function Chip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors',
        active
          ? 'border-transparent bg-gold text-gold-foreground'
          : 'border-gold/35 bg-white/5 text-white hover:bg-white/10',
      )}
    >
      {label}
    </button>
  )
}

type GuestDraft = {
  name: string
  headcount: number
  side: GuestSide | null
  relation: GuestRelation | null
  events: string[]
  notes: string
}

type GuestDraftValid = {
  name: string
  headcount: number
  side: GuestSide
  relation: GuestRelation
  events: string[]
  notes: string
}

const emptyDraft = (): GuestDraft => ({
  name: '',
  headcount: 4,
  side: null,
  relation: null,
  events: [],
  notes: '',
})

function normalizeName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function similarGuests(query: string, guests: Guest[], excludeId?: string): Guest[] {
  const q = normalizeName(query)
  // Start matching after 3 characters typed
  if (q.length < 3) return []

  return guests
    .filter((g) => {
      if (excludeId && g.id === excludeId) return false
      const name = normalizeName(g.name)
      return name.includes(q) || q.includes(name) || name.split(' ').some((w) => w.startsWith(q) || q.startsWith(w))
    })
    .slice(0, 5)
}

function GuestDrawerForm({
  open,
  onOpenChange,
  title,
  description,
  eventNames,
  existingGuests,
  excludeGuestId,
  initial,
  submitLabel,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  eventNames: string[]
  existingGuests: Guest[]
  excludeGuestId?: string
  initial: GuestDraft
  submitLabel: string
  onSubmit: (draft: GuestDraftValid) => Promise<void>
}) {
  const [draft, setDraft] = useState(initial)
  const [saving, setSaving] = useState(false)

  const matches = useMemo(
    () => similarGuests(draft.name, existingGuests, excludeGuestId),
    [draft.name, existingGuests, excludeGuestId],
  )

  const allSelected = eventNames.length > 0 && draft.events.length === eventNames.length

  const toggleEvent = (name: string) => {
    setDraft((d) => ({
      ...d,
      events: d.events.includes(name)
        ? d.events.filter((n) => n !== name)
        : [...d.events, name],
    }))
  }

  const handleSubmit = async () => {
    const name = draft.name.trim()
    if (name.length < 2) {
      toast.error('Name is required')
      return
    }
    if (!draft.headcount || draft.headcount < 1) {
      toast.error('People count is required')
      return
    }
    if (!draft.side) {
      toast.error('Select a side')
      return
    }
    if (!draft.relation) {
      toast.error('Select a relation')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        name,
        headcount: draft.headcount,
        side: draft.side,
        relation: draft.relation,
        events: draft.events,
        notes: draft.notes,
      })
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={false} shouldScaleBackground={false}>
      <DrawerContent>
        <DrawerHeader className="relative pr-10 text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
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

        <div className="space-y-3 overflow-y-auto px-3 pb-1 pt-3">
          <div className="grid grid-cols-[1fr_auto] items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="guest-v2-name" className="text-xs text-white/75">
                Name <span className="text-gold">*</span>
              </Label>
              <Input
                id="guest-v2-name"
                className="h-9"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="Guest name"
                autoFocus
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-white/75">
                People <span className="text-gold">*</span>
              </Label>
              <div className="flex h-9 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Decrease people"
                  disabled={draft.headcount <= 1}
                  onClick={() => setDraft((d) => ({ ...d, headcount: Math.max(1, d.headcount - 1) }))}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="min-w-6 text-center font-display text-lg font-semibold text-gold">
                  {draft.headcount}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  aria-label="Increase people"
                  disabled={draft.headcount >= 99}
                  onClick={() => setDraft((d) => ({ ...d, headcount: Math.min(99, d.headcount + 1) }))}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {matches.length > 0 && (
            <div className="rounded-md border border-amber-400/40 bg-amber-400/10 px-2.5 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-amber-200/90">
                Similar names already on list
              </p>
              <ul className="mt-1.5 space-y-1">
                {matches.map((g) => (
                  <li key={g.id} className="text-xs text-white/85">
                    <span className="font-medium text-gold">{g.name}</span>
                    <span className="text-white/55">
                      {' · '}
                      {SIDE_LABEL[g.side]}
                      {' · '}
                      {g.headcount} {g.headcount === 1 ? 'person' : 'people'}
                      {g.relation ? ` · ${RELATION_LABEL[g.relation]}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-xs text-white/75">
              Side <span className="text-gold">*</span>
            </Label>
            <div className="flex flex-wrap gap-1">
              {SIDE_CHIPS.map((chip) => (
                <Chip
                  key={chip.value}
                  label={chip.label}
                  active={draft.side === chip.value}
                  onClick={() => setDraft((d) => ({ ...d, side: chip.value }))}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white/75">
              Relation <span className="text-gold">*</span>
            </Label>
            <div className="flex flex-wrap gap-1">
              {RELATION_CHIPS.map((chip) => (
                <Chip
                  key={chip.value}
                  label={chip.label}
                  active={draft.relation === chip.value}
                  onClick={() => setDraft((d) => ({ ...d, relation: chip.value }))}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-white/75">Events</Label>
            {eventNames.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet. Add them under Events first.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                <Chip
                  label="All"
                  active={allSelected}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      events: allSelected ? [] : [...eventNames],
                    }))
                  }
                />
                {eventNames.map((name) => (
                  <Chip
                    key={name}
                    label={name}
                    active={draft.events.includes(name)}
                    onClick={() => toggleEvent(name)}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="guest-v2-notes" className="text-xs text-white/75">Note</Label>
            <Textarea
              id="guest-v2-notes"
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Optional note"
            />
          </div>
        </div>

        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

function GuestList({
  guests,
  onEdit,
  onDelete,
}: {
  guests: Guest[]
  onEdit: (g: Guest) => void
  onDelete: (id: string) => void
}) {
  if (guests.length === 0) {
    return <p className="py-8 text-center text-sm text-white/60">No guests in this tab yet.</p>
  }

  return (
    <div className="space-y-2">
      {guests.map((g) => (
        <div
          key={g.id}
          className="flex items-start justify-between gap-2 rounded-md border border-gold/30 bg-white/5 px-3 py-3"
        >
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-white">{g.name}</p>
            <p className="mt-0.5 text-sm text-white/70">
              {g.headcount} {g.headcount === 1 ? 'person' : 'people'}
              {g.relation ? ` · ${RELATION_LABEL[g.relation]}` : ''}
              {g.events_attending ? ` · ${g.events_attending}` : ''}
            </p>
            {g.notes && <p className="mt-1 text-sm text-white/55">{g.notes}</p>}
          </div>
          <div className="flex shrink-0 gap-0.5">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => onEdit(g)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => onDelete(g.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

export function GuestsV2Page() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<SideTab>('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [editGuest, setEditGuest] = useState<Guest | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)

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

  const bySide = useMemo(() => {
    const groups: Record<SideTab, Guest[]> = {
      all: guests,
      bride: [],
      groom: [],
      common: [],
    }
    for (const g of guests) {
      groups[g.side].push(g)
    }
    return groups
  }, [guests])

  const totals = useMemo(() => {
    const count = (list: Guest[]) => list.reduce((sum, g) => sum + Math.max(1, Number(g.headcount) || 1), 0)
    return {
      all: count(guests),
      bride: count(bySide.bride),
      groom: count(bySide.groom),
      common: count(bySide.common),
    }
  }, [guests, bySide])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['guests'] })
      setDeleteId(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const saveDraft = async (draft: GuestDraftValid, id?: string) => {
    const payload = {
      name: draft.name,
      side: draft.side,
      relation: draft.relation,
      rsvp_status: 'confirmed' as const,
      headcount: draft.headcount,
      wedding_id: WEDDING_ID,
      events_attending: draft.events.length
        ? draft.events.length === eventNames.length
          ? 'All'
          : draft.events.join(', ')
        : null,
      notes: draft.notes.trim() || null,
    }
    const { error } = id
      ? await supabase.from('guests').update(payload).eq('id', id)
      : await supabase.from('guests').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(id ? 'Updated' : 'Guest added')
    qc.invalidateQueries({ queryKey: ['guests'] })
    setEditGuest(null)
  }

  const editDraft: GuestDraft = editGuest
    ? {
        name: editGuest.name,
        headcount: Math.max(1, Number(editGuest.headcount) || 4),
        side: editGuest.side,
        relation: editGuest.relation,
        events: parseSelectedEvents(editGuest.events_attending, eventNames),
        notes: editGuest.notes ?? '',
      }
    : emptyDraft()

  return (
    <div className="space-y-5">
      <PageHeader
        title="Guest list v2"
        description="Simple list with drawer add."
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as SideTab)}>
        <TabsList className="grid h-auto w-full grid-cols-4 p-1">
          {FILTER_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="flex flex-col gap-0.5 py-2 text-xs">
              <span>{t.label}</span>
              <span className="font-display text-sm font-semibold">{totals[t.value]}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {isLoading && <p className="py-6 text-center text-sm text-white/60">Loading…</p>}

        {!isLoading &&
          FILTER_TABS.map((t) => (
            <TabsContent key={t.value} value={t.value} className="mt-4">
              <GuestList
                guests={bySide[t.value]}
                onEdit={setEditGuest}
                onDelete={setDeleteId}
              />
            </TabsContent>
          ))}
      </Tabs>

      <GuestDrawerForm
        key={createOpen ? 'create-open' : 'create-closed'}
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add guest"
        description="Name, people, side, events, and a note."
        eventNames={eventNames}
        existingGuests={guests}
        initial={emptyDraft()}
        submitLabel="Add guest"
        onSubmit={(draft) => saveDraft(draft)}
      />

      {editGuest && (
        <GuestDrawerForm
          key={editGuest.id}
          open={!!editGuest}
          onOpenChange={(o) => !o && setEditGuest(null)}
          title="Edit guest"
          description="Update guest details."
          eventNames={eventNames}
          existingGuests={guests}
          excludeGuestId={editGuest.id}
          initial={editDraft}
          submitLabel="Save changes"
          onSubmit={(draft) => saveDraft(draft, editGuest.id)}
        />
      )}

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete guest?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
