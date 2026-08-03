import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CatalogChipOption = {
  key: string
  label: string
}

export function PaymentCatalogChips({
  label,
  value,
  onChange,
  options,
  onManage,
  allowNone = true,
  emptyHint,
}: {
  label: string
  value: string
  onChange: (key: string) => void
  options: CatalogChipOption[]
  onManage?: () => void
  allowNone?: boolean
  emptyHint?: string
}) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">{label}</p>
        {onManage ? (
          <button
            type="button"
            onClick={onManage}
            className="inline-flex h-6 items-center gap-0.5 rounded-md px-1.5 text-[11px] font-medium text-gold hover:bg-white/[0.04]"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-1">
        {allowNone ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className={cn(
              'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
              !value
                ? 'border-transparent bg-gold text-gold-foreground'
                : 'border-gold/25 text-white/60 hover:bg-white/5',
            )}
          >
            None
          </button>
        ) : null}
        {options.map((option) => {
          const active = value === option.key
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => onChange(option.key)}
              className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors',
                active
                  ? 'border-transparent bg-gold text-gold-foreground'
                  : 'border-gold/25 text-white/60 hover:bg-white/5',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
      {options.length === 0 && emptyHint ? (
        <p className="text-[11px] text-white/40">{emptyHint}</p>
      ) : null}
    </>
  )
}
