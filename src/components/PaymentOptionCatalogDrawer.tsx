import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { Input } from '@/components/ui/input'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import { slugifyKey } from '@/lib/utils'
import { CATALOG_LABELS } from '@/lib/paymentCatalog'

export type PaymentCatalogOption = {
  id: string
  wedding_id: string
  key: string
  label: string
  sort_order: number
}

type CatalogKind = 'makers' | 'sources'

const CLEAR_TABLES = ['budget_payments', 'bank_funds'] as const

const CATALOG: Record<
  CatalogKind,
  {
    table: 'payment_makers' | 'payment_sources'
    queryKey: string[]
    paymentColumn: 'made_by' | 'payment_source'
    title: string
    placeholder: string
    empty: string
  }
> = {
  makers: {
    table: 'payment_makers',
    queryKey: ['payment_makers'],
    paymentColumn: 'made_by',
    title: CATALOG_LABELS.maker.manage,
    placeholder: CATALOG_LABELS.maker.placeholder,
    empty: 'No people yet.',
  },
  sources: {
    table: 'payment_sources',
    queryKey: ['payment_sources'],
    paymentColumn: 'payment_source',
    title: CATALOG_LABELS.source.manage,
    placeholder: CATALOG_LABELS.source.placeholder,
    empty: 'No accounts yet.',
  },
}

export function PaymentOptionCatalogDrawer({
  kind,
  open,
  onOpenChange,
  options,
  usageCounts,
}: {
  kind: CatalogKind
  open: boolean
  onOpenChange: (open: boolean) => void
  options: PaymentCatalogOption[]
  usageCounts: Record<string, number>
}) {
  const meta = CATALOG[kind]
  const qc = useQueryClient()
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const addOption = async () => {
    const trimmed = label.trim()
    if (trimmed.length < 2) {
      toast.error('Name is required')
      return
    }
    const key = slugifyKey(trimmed)
    if (!key) {
      toast.error('Use letters or numbers in the name')
      return
    }
    if (options.some((o) => o.key === key)) {
      toast.error('That option already exists')
      return
    }
    setAdding(true)
    try {
      const sort_order =
        options.length > 0 ? Math.max(...options.map((o) => o.sort_order)) + 1 : 0
      const { error } = await supabase.from(meta.table).insert({
        wedding_id: WEDDING_ID,
        key,
        label: trimmed,
        sort_order,
      })
      if (error) throw error
      toast.success('Added')
      setLabel('')
      qc.invalidateQueries({ queryKey: meta.queryKey })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to add')
    } finally {
      setAdding(false)
    }
  }

  const removeOption = async (opt: PaymentCatalogOption) => {
    setRemovingId(opt.id)
    try {
      const inUse = usageCounts[opt.key] ?? 0
      if (inUse > 0) {
        for (const table of CLEAR_TABLES) {
          const { error: clearError } = await supabase
            .from(table)
            .update({ [meta.paymentColumn]: null })
            .eq('wedding_id', WEDDING_ID)
            .eq(meta.paymentColumn, opt.key)
          if (clearError) throw clearError
        }
      }
      const { error } = await supabase.from(meta.table).delete().eq('id', opt.id)
      if (error) throw error
      toast.success(inUse > 0 ? `Removed · ${inUse} use(s) cleared` : 'Removed')
      qc.invalidateQueries({ queryKey: meta.queryKey })
      qc.invalidateQueries({ queryKey: ['budget-payments'] })
      qc.invalidateQueries({ queryKey: ['bank-funds'] })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove')
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) setLabel('')
        onOpenChange(o)
      }}
      dismissible={false}
      shouldScaleBackground={false}
      repositionInputs={false}
      fixed
    >
      <DrawerContent>
        <DrawerHeader className="relative shrink-0 pr-10 text-left">
          <DrawerTitle>{meta.title}</DrawerTitle>
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-4 pt-2">
          <div className="flex gap-2">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={meta.placeholder}
              className="h-9"
              enterKeyHint="done"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void addOption()
                }
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0"
              disabled={adding}
              onClick={() => void addOption()}
            >
              <Plus className="mr-1 h-4 w-4" />
              {adding ? 'Adding…' : 'Add'}
            </Button>
          </div>

          <ul className="space-y-1">
            {options.length === 0 && (
              <li className="py-6 text-center text-sm text-white/55">{meta.empty}</li>
            )}
            {options.map((opt) => (
              <li
                key={opt.id}
                className="flex items-center justify-between gap-2 rounded-md border border-gold/20 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">{opt.label}</p>
                  <p className="text-[11px] text-white/45">
                    {usageCounts[opt.key] ?? 0}{' '}
                    {(usageCounts[opt.key] ?? 0) === 1 ? 'use' : 'uses'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-white/50 hover:text-destructive"
                  aria-label={`Remove ${opt.label}`}
                  disabled={removingId === opt.id}
                  onClick={() => void removeOption(opt)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
