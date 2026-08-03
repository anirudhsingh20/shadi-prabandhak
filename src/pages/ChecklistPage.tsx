import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { CalendarDays, Check, ChevronUp, MoreHorizontal, Pencil, Plus, Trash2, X } from 'lucide-react'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { PageHeader } from '@/components/PageHeader'
import { isSuggestMenuTarget, SuggestInput } from '@/components/SuggestInput'
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
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { checklistItemSchema, type ChecklistItemInput } from '@/lib/validations'
import type {
  ChecklistItem,
  ChecklistPriority,
  ChecklistStatus,
} from '@/lib/types'

const PRIORITY_OPTIONS: ChecklistPriority[] = ['high', 'medium', 'low']

const PRIORITY_LABEL: Record<ChecklistPriority, string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

function PriorityIcon({
  priority,
  className,
}: {
  priority: ChecklistPriority
  className?: string
}) {
  if (priority === 'low') {
    return (
      <span
        className={cn('inline-flex h-3.5 w-3 items-center justify-center', className)}
        aria-hidden
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
      </span>
    )
  }

  const count = priority === 'high' ? 3 : 2
  const color = priority === 'high' ? 'text-red-500' : 'text-amber-400'

  return (
    <span
      className={cn('inline-flex h-3.5 w-3 flex-col items-center justify-center', className)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, i) => (
        <ChevronUp
          key={i}
          className={cn('h-2 w-2 stroke-[3]', color, i > 0 && '-mt-[5px]')}
        />
      ))}
    </span>
  )
}

function statusForPriority(priority: ChecklistPriority): ChecklistStatus {
  return priority === 'high' ? 'next' : 'later'
}

function isIsoDate(value: string | null | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function formatDueLabel(value: string | null | undefined) {
  if (!value) return null
  if (!isIsoDate(value)) return value
  const d = new Date(`${value}T12:00:00`)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function DueDateField({
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
  const iso = isIsoDate(value) ? value : ''
  const label = formatDueLabel(iso)

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
        value={iso}
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
          iso
            ? 'border-gold/40 bg-gold/10 text-gold'
            : 'border-gold/20 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]',
        )}
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label ?? 'Pick date'}</span>
      </button>
      {iso ? (
        <button
          type="button"
          aria-label="Clear due date"
          onClick={() => onChange('')}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#10081c] text-white/50 ring-1 ring-gold/25 hover:text-white"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </div>
  )
}

function QuickAddRow({
  onAdd,
  disabled,
}: {
  onAdd: (title: string, priority: ChecklistPriority) => Promise<void>
  disabled?: boolean
}) {
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const typing = title.trim().length > 0

  const submit = async (priority: ChecklistPriority = 'low') => {
    const trimmed = title.trim()
    if (trimmed.length < 2 || busy || disabled) return
    setBusy(true)
    try {
      await onAdd(trimmed, priority)
      setTitle('')
    } catch {
      // parent toasts
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="flex items-start gap-1.5 rounded-md px-1.5 py-1.5">
      <span
        className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border border-dashed border-white/25"
        aria-hidden
      />
      <span className="mt-1 h-3.5 w-3 shrink-0" aria-hidden />
      <input
        value={title}
        disabled={busy || disabled}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            void submit()
          }
        }}
        placeholder="Add a task…"
        className="min-w-0 flex-1 bg-transparent text-base leading-snug text-white/90 outline-none placeholder:text-white/30 disabled:opacity-50"
      />
      {typing ? (
        <div
          className="flex shrink-0 items-center gap-0.5"
          role="group"
          aria-label="Add with priority"
        >
          {PRIORITY_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              title={`Add as ${PRIORITY_LABEL[value]}`}
              aria-label={`Add as ${PRIORITY_LABEL[value]}`}
              disabled={busy || disabled}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => void submit(value)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent transition-colors hover:border-gold/40 hover:bg-gold/10"
            >
              <PriorityIcon priority={value} />
            </button>
          ))}
        </div>
      ) : null}
    </li>
  )
}

function NotionCheckbox({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation()
        onChange()
      }}
      className={cn(
        'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold/60',
        checked
          ? 'border-gold bg-gold text-gold-foreground'
          : 'border-white/35 bg-transparent text-transparent hover:border-gold/55',
        disabled && 'opacity-50',
      )}
    >
      <Check className="h-3 w-3 stroke-[3]" aria-hidden />
    </button>
  )
}

function ChecklistDrawerShell({
  open,
  onOpenChange,
  title,
  children,
  footer,
  onPortalHost,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: ReactNode
  footer?: ReactNode
  onPortalHost: (node: HTMLDivElement | null) => void
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
      <DrawerContent
        className="max-h-[min(88dvh,640px)] overflow-hidden"
        onPointerDownOutside={(e) => {
          if (isSuggestMenuTarget(e.target)) e.preventDefault()
        }}
        onInteractOutside={(e) => {
          if (isSuggestMenuTarget(e.target)) e.preventDefault()
        }}
      >
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
        <div ref={onPortalHost} className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-28 pt-2 [touch-action:pan-y]">
            {children}
          </div>
        </div>
        {footer ? (
          <DrawerFooter className="shrink-0 border-t border-gold/20">{footer}</DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function ChecklistForm({
  defaultValues,
  groupSuggestions = [],
  portalHost,
  onSubmit,
  formId = 'checklist-form',
  onSubmittingChange,
}: {
  defaultValues?: Partial<ChecklistItemInput>
  groupSuggestions?: string[]
  portalHost?: HTMLElement | null
  onSubmit: (values: ChecklistItemInput) => Promise<void>
  formId?: string
  onSubmittingChange?: (submitting: boolean) => void
}) {
  const form = useForm<ChecklistItemInput>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      group_label: '',
      title: '',
      due_label: '',
      priority: 'low',
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
          name="title"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Task
              </p>
              <FormControl>
                <Input
                  autoFocus
                  placeholder="What needs to get done?"
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
          name="group_label"
          render={({ field }) => (
            <FormItem className="space-y-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                Group <span className="normal-case tracking-normal text-white/30">(optional)</span>
              </p>
              <FormControl>
                <SuggestInput
                  suggestions={groupSuggestions}
                  portalHost={portalHost}
                  name={field.name}
                  ref={field.ref}
                  value={field.value ?? ''}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  placeholder="e.g. July – August 2026"
                  className="border-b border-gold/30 pb-1"
                  inputClassName="h-auto min-h-0 w-full border-0 bg-transparent px-0 py-1 text-sm shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-end gap-4">
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                  Priority
                </p>
                <FormControl>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITY_OPTIONS.map((value) => {
                      const active = field.value === value
                      return (
                        <button
                          key={value}
                          type="button"
                          title={PRIORITY_LABEL[value]}
                          aria-label={PRIORITY_LABEL[value]}
                          aria-pressed={active}
                          onClick={() => field.onChange(value)}
                          className={cn(
                            'flex h-8 w-8 items-center justify-center rounded-md border transition-colors',
                            active
                              ? 'border-gold/50 bg-gold/15'
                              : 'border-gold/20 bg-white/[0.03] hover:bg-white/[0.06]',
                          )}
                        >
                          <PriorityIcon priority={value} />
                        </button>
                      )
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="due_label"
            render={({ field }) => (
              <FormItem className="shrink-0 space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                  Due
                </p>
                <FormControl>
                  <DueDateField
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
        </div>
      </form>
    </Form>
  )
}

export function ChecklistPage() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [createPortalHost, setCreatePortalHost] = useState<HTMLElement | null>(null)
  const [editPortalHost, setEditPortalHost] = useState<HTMLElement | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<Set<ChecklistPriority>>(
    () => new Set(),
  )

  const setCreatePortalHostRef = useCallback((node: HTMLDivElement | null) => {
    setCreatePortalHost(node)
  }, [])
  const setEditPortalHostRef = useCallback((node: HTMLDivElement | null) => {
    setEditPortalHost(node)
  }, [])

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('wedding_id', WEDDING_ID)
        .order('sort_order')
      if (error) throw error
      return data as ChecklistItem[]
    },
  })

  const filteredItems = useMemo(() => {
    if (priorityFilter.size === 0) return items
    return items.filter((item) => priorityFilter.has(item.priority ?? 'low'))
  }, [items, priorityFilter])

  const togglePriorityFilter = (value: ChecklistPriority) => {
    setPriorityFilter((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const filterEmptyLabel = useMemo(() => {
    if (priorityFilter.size === 0) return ''
    return (
      [...priorityFilter]
        .map((p) => PRIORITY_LABEL[p].toLowerCase())
        .join(' / ') + ' '
    )
  }, [priorityFilter])

  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>()
    for (const item of filteredItems) {
      const key = item.group_label?.trim() || ''
      const list = map.get(key) ?? []
      list.push(item)
      map.set(key, list)
    }
    // Ungrouped first, then named groups (alpha)
    return [...map.entries()].sort(([a], [b]) => {
      if (!a) return -1
      if (!b) return 1
      return a.localeCompare(b)
    })
  }, [filteredItems])

  const groupSuggestions = useMemo(() => {
    const seen = new Set<string>()
    const groups: string[] = []
    for (const item of items) {
      const key = item.group_label?.trim()
      if (!key || seen.has(key)) continue
      seen.add(key)
      groups.push(key)
    }
    return groups.sort((a, b) => a.localeCompare(b))
  }, [items])

  const priorityCounts = useMemo(() => {
    const counts = { all: items.length, high: 0, medium: 0, low: 0 }
    for (const item of items) {
      const p = item.priority ?? 'low'
      counts[p] += 1
    }
    return counts
  }, [items])

  const progress = useMemo(() => {
    if (!items.length) return { done: 0, total: 0 }
    return {
      done: items.filter((i) => i.status === 'done').length,
      total: items.length,
    }
  }, [items])

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Deleted')
      qc.invalidateQueries({ queryKey: ['checklist'] })
      setDeleteId(null)
      setEditItem(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const patchMutation = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<Pick<ChecklistItem, 'status' | 'priority'>>
    }) => {
      const { error } = await supabase.from('checklist_items').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ['checklist'] })
      const prev = qc.getQueryData<ChecklistItem[]>(['checklist'])
      qc.setQueryData<ChecklistItem[]>(['checklist'], (old) =>
        (old ?? []).map((item) => (item.id === id ? { ...item, ...patch } : item)),
      )
      return { prev }
    },
    onError: (e: Error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['checklist'], ctx.prev)
      toast.error(e.message)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['checklist'] })
    },
  })

  const toggleDone = (item: ChecklistItem) => {
    const priority = item.priority ?? 'low'
    const status: ChecklistStatus =
      item.status === 'done' ? statusForPriority(priority) : 'done'
    patchMutation.mutate({ id: item.id, patch: { status } })
  }

  const setPriority = (item: ChecklistItem, priority: ChecklistPriority) => {
    const patch: Partial<Pick<ChecklistItem, 'status' | 'priority'>> = { priority }
    if (item.status !== 'done') {
      patch.status = statusForPriority(priority)
    }
    patchMutation.mutate({ id: item.id, patch })
  }

  const quickAdd = async (
    title: string,
    groupLabel: string,
    priority: ChecklistPriority = 'low',
  ) => {
    const sort_order =
      items.length > 0 ? Math.max(...items.map((i) => i.sort_order)) + 1 : 0
    const payload = {
      group_label: groupLabel,
      title,
      due_label: null as string | null,
      priority,
      status: statusForPriority(priority),
      sort_order,
      wedding_id: WEDDING_ID,
    }
    const { data, error } = await supabase
      .from('checklist_items')
      .insert(payload)
      .select('*')
      .single()
    if (error) {
      toast.error(error.message)
      throw new Error(error.message)
    }
    if (data) {
      qc.setQueryData<ChecklistItem[]>(['checklist'], (old) => [...(old ?? []), data as ChecklistItem])
    }
    qc.invalidateQueries({ queryKey: ['checklist'] })
  }

  const save = async (values: ChecklistItemInput, existing?: ChecklistItem) => {
    const sort_order =
      existing != null
        ? existing.sort_order
        : items.length > 0
          ? Math.max(...items.map((i) => i.sort_order)) + 1
          : 0
    const wasDone = existing?.status === 'done'
    const status: ChecklistStatus = wasDone
      ? 'done'
      : statusForPriority(values.priority)

    const payload = {
      group_label: values.group_label?.trim() || '',
      title: values.title.trim(),
      due_label: values.due_label || null,
      priority: values.priority,
      status,
      sort_order,
      wedding_id: WEDDING_ID,
    }
    const { error } = existing
      ? await supabase.from('checklist_items').update(payload).eq('id', existing.id)
      : await supabase.from('checklist_items').insert(payload)
    if (error) throw new Error(error.message)
    toast.success(existing ? 'Updated' : 'Added')
    qc.invalidateQueries({ queryKey: ['checklist'] })
    setCreateOpen(false)
    setEditItem(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Checklist"
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        }
      />

      {(progress.total > 0 || items.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1" role="group" aria-label="Filter by priority">
            <button
              type="button"
              onClick={() => setPriorityFilter(new Set())}
              aria-pressed={priorityFilter.size === 0}
              className={cn(
                'flex h-7 items-center rounded-md border px-2 text-[11px] font-medium transition-colors',
                priorityFilter.size === 0
                  ? 'border-gold/50 bg-gold/15 text-gold'
                  : 'border-gold/20 bg-white/[0.03] text-white/55 hover:bg-white/[0.06]',
              )}
            >
              All
              <span className="ml-1 tabular-nums opacity-70">{priorityCounts.all}</span>
            </button>
            {PRIORITY_OPTIONS.map((value) => {
              const active = priorityFilter.has(value)
              return (
                <button
                  key={value}
                  type="button"
                  title={PRIORITY_LABEL[value]}
                  aria-label={`Filter ${PRIORITY_LABEL[value]}`}
                  aria-pressed={active}
                  onClick={() => togglePriorityFilter(value)}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-md border transition-colors',
                    active
                      ? 'border-gold/50 bg-gold/15'
                      : 'border-gold/20 bg-white/[0.03] hover:bg-white/[0.06]',
                  )}
                >
                  <PriorityIcon priority={value} />
                </button>
              )
            })}
          </div>

          <p className="text-[11px] text-white/45">
            <span className="tabular-nums text-gold">{progress.done}</span>
            <span className="text-white/30"> / </span>
            <span className="tabular-nums">{progress.total}</span>
            <span> done</span>
          </p>
        </div>
      )}

      {isLoading && <p className="text-sm text-white/50">Loading…</p>}

      {!isLoading && items.length === 0 && (
        <section className="space-y-0.5">
          <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
            <h2 className="font-display text-[15px] font-semibold tracking-wide text-white/45">
              General
            </h2>
          </div>
          <ul className="space-y-0.5">
            <QuickAddRow onAdd={(title, priority) => quickAdd(title, '', priority)} />
          </ul>
        </section>
      )}

      {!isLoading && items.length > 0 && grouped.length === 0 && (
        <p className="py-10 text-center text-sm text-white/50">
          {`No ${filterEmptyLabel}tasks.`}
        </p>
      )}

      <div className="space-y-6">
        {grouped.map(([group, groupItems]) => {
          const groupDone = groupItems.filter((i) => i.status === 'done').length
          const groupTitle = group || 'General'
          return (
            <section key={group || '__general__'} className="space-y-0.5">
              <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                <h2
                  className={cn(
                    'font-display text-[15px] font-semibold tracking-wide',
                    group ? 'text-gold/90' : 'text-white/45',
                  )}
                >
                  {groupTitle}
                </h2>
                <span className="text-[10px] tabular-nums text-white/35">
                  {groupDone}/{groupItems.length}
                </span>
              </div>

              <ul className="space-y-0.5">
                {groupItems.map((item) => {
                  const done = item.status === 'done'
                  const priority = item.priority ?? 'low'
                  return (
                    <li
                      key={item.id}
                      className="group flex items-start gap-1.5 rounded-md px-1.5 py-1.5 transition-colors hover:bg-white/[0.04]"
                    >
                      <NotionCheckbox
                        checked={done}
                        disabled={patchMutation.isPending}
                        onChange={() => toggleDone(item)}
                      />

                      {!done && priority !== 'low' ? (
                        <PriorityIcon priority={priority} className="mt-1 shrink-0" />
                      ) : (
                        <span className="mt-1 h-3.5 w-3 shrink-0" aria-hidden />
                      )}

                      <button
                        type="button"
                        onClick={() => setEditItem(item)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p
                          className={cn(
                            'text-[14px] leading-snug',
                            done
                              ? 'text-white/40 line-through decoration-white/30'
                              : priority === 'high'
                                ? 'font-semibold text-white'
                                : priority === 'low'
                                  ? 'text-white/70'
                                  : 'text-white/90',
                          )}
                        >
                          {item.title}
                        </p>
                        {item.due_label ? (
                          <p className="mt-0.5 truncate text-[10px] leading-snug text-white/40">
                            {formatDueLabel(item.due_label)}
                          </p>
                        ) : null}
                      </button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 data-[state=open]:opacity-100"
                            aria-label="Task actions"
                          >
                            <MoreHorizontal className="h-4 w-4 text-white/55" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setEditItem(item)}>
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {PRIORITY_OPTIONS.map((value) => (
                            <DropdownMenuItem
                              key={value}
                              onClick={() => setPriority(item, value)}
                            >
                              <PriorityIcon priority={value} className="mr-2" />
                              {PRIORITY_LABEL[value]}
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setDeleteId(item.id)}
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </li>
                  )
                })}
                {priorityFilter.size === 0 ? (
                  <QuickAddRow onAdd={(title, priority) => quickAdd(title, group, priority)} />
                ) : null}
              </ul>
            </section>
          )
        })}
      </div>

      <ChecklistDrawerShell
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open)
          if (!open) setFormSubmitting(false)
        }}
        title="Add task"
        onPortalHost={setCreatePortalHostRef}
        footer={
          <Button
            type="submit"
            form="checklist-form-create"
            className="h-9 w-full text-sm"
            disabled={formSubmitting}
          >
            {formSubmitting ? 'Saving…' : 'Add task'}
          </Button>
        }
      >
        <ChecklistForm
          key={createOpen ? 'create-open' : 'create-closed'}
          formId="checklist-form-create"
          groupSuggestions={groupSuggestions}
          portalHost={createPortalHost}
          onSubmittingChange={setFormSubmitting}
          onSubmit={async (v) => {
            try {
              await save(v)
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'Failed to save')
              throw e
            }
          }}
        />
      </ChecklistDrawerShell>

      <ChecklistDrawerShell
        open={!!editItem}
        onOpenChange={(open) => {
          if (!open) {
            setEditItem(null)
            setFormSubmitting(false)
          }
        }}
        title="Edit task"
        onPortalHost={setEditPortalHostRef}
        footer={
          editItem ? (
            <div className="flex w-full gap-2">
              <Button
                type="submit"
                form="checklist-form-edit"
                className="h-9 flex-1 text-sm"
                disabled={formSubmitting}
              >
                {formSubmitting ? 'Saving…' : 'Save'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteId(editItem.id)}
              >
                Delete
              </Button>
            </div>
          ) : null
        }
      >
        {editItem && (
          <ChecklistForm
            key={editItem.id}
            formId="checklist-form-edit"
            groupSuggestions={groupSuggestions}
            portalHost={editPortalHost}
            onSubmittingChange={setFormSubmitting}
            defaultValues={{
              group_label: editItem.group_label,
              title: editItem.title,
              due_label: editItem.due_label ?? '',
              priority: editItem.priority ?? 'low',
              sort_order: editItem.sort_order,
            }}
            onSubmit={async (v) => {
              try {
                await save(v, editItem)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'Failed to save')
                throw e
              }
            }}
          />
        )}
      </ChecklistDrawerShell>

      <DeleteConfirm
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete task?"
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
