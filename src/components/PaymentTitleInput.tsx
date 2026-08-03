import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Clock3, TextSearch } from 'lucide-react'
import { usePaymentDrawerPortal } from '@/components/PaymentDrawerPortalContext'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 150
const MAX_SUGGESTIONS = 6

export const PAYMENT_TITLE_MENU_ATTR = 'data-payment-title-menu'
export const PAYMENT_TITLE_MENU_SELECTOR = `[${PAYMENT_TITLE_MENU_ATTR}]`

export function isPaymentTitleMenuTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(PAYMENT_TITLE_MENU_SELECTOR) !== null
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function filterTitleSuggestions(query: string, suggestions: string[]) {
  const q = query.trim().toLowerCase()
  if (!q) return suggestions.slice(0, MAX_SUGGESTIONS)

  return suggestions
    .filter((title) => {
      const lower = title.toLowerCase()
      return lower.includes(q) && lower !== q
    })
    .sort((a, b) => {
      const aLower = a.toLowerCase()
      const bLower = b.toLowerCase()
      const aStarts = aLower.startsWith(q)
      const bStarts = bLower.startsWith(q)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.localeCompare(b)
    })
    .slice(0, MAX_SUGGESTIONS)
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>

  const lower = text.toLowerCase()
  const idx = lower.indexOf(q.toLowerCase())
  if (idx === -1) return <>{text}</>

  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-gold">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  )
}

type PaymentTitleInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  name: string
  suggestions: string[]
  className?: string
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
}

export const PaymentTitleInput = forwardRef<HTMLInputElement, PaymentTitleInputProps>(
  function PaymentTitleInput(
    {
      value,
      onChange,
      onBlur,
      name,
      suggestions,
      className,
      id,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
    },
    ref,
  ) {
    const reactId = useId()
    const drawerPortalHost = usePaymentDrawerPortal()
    const wrapRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const [open, setOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [menuRect, setMenuRect] = useState<{
      top: number
      left: number
      width: number
    } | null>(null)
    const debouncedQuery = useDebouncedValue(value, DEBOUNCE_MS)
    const query = debouncedQuery.trim()

    const matches = useMemo(
      () => filterTitleSuggestions(debouncedQuery, suggestions),
      [debouncedQuery, suggestions],
    )

    const showMenu = open && matches.length > 0
    const showRecent = query.length === 0
    const listId = `${name || reactId}-title-suggestions`

    const updateMenuRect = () => {
      const anchor = wrapRef.current
      const host = drawerPortalHost
      if (!anchor || !host) return
      const a = anchor.getBoundingClientRect()
      const h = host.getBoundingClientRect()
      setMenuRect({
        top: a.bottom - h.top + 6,
        left: a.left - h.left,
        width: Math.max(a.width, 220),
      })
    }

    useLayoutEffect(() => {
      if (!showMenu) {
        setMenuRect(null)
        return
      }
      updateMenuRect()
    }, [showMenu, value, matches.length, drawerPortalHost])

    useEffect(() => {
      if (!showMenu) return
      const onLayoutChange = () => updateMenuRect()
      const scrollEl = drawerPortalHost?.querySelector('[data-payment-drawer-scroll]')
      window.addEventListener('resize', onLayoutChange)
      window.addEventListener('scroll', onLayoutChange, true)
      scrollEl?.addEventListener('scroll', onLayoutChange)
      return () => {
        window.removeEventListener('resize', onLayoutChange)
        window.removeEventListener('scroll', onLayoutChange, true)
        scrollEl?.removeEventListener('scroll', onLayoutChange)
      }
    }, [showMenu, drawerPortalHost])

    useEffect(() => {
      setActiveIndex(-1)
    }, [debouncedQuery, matches.length])

    useEffect(() => {
      if (activeIndex < 0 || !listRef.current) return
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    const pick = (title: string) => {
      onChange(title)
      setOpen(false)
      setActiveIndex(-1)
    }

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (!showMenu) return
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % matches.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (i <= 0 ? matches.length - 1 : i - 1))
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault()
        pick(matches[activeIndex]!)
      } else if (e.key === 'Escape') {
        setOpen(false)
        setActiveIndex(-1)
      } else if (e.key === 'Tab') {
        setOpen(false)
        setActiveIndex(-1)
      }
    }

    const menu =
      showMenu && menuRect && drawerPortalHost
        ? createPortal(
            <div
              {...{ [PAYMENT_TITLE_MENU_ATTR]: '' }}
              className="absolute z-[200] animate-in fade-in-0 slide-in-from-top-1 duration-150"
              style={{
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
              }}
            >
              <div className="overflow-hidden rounded-lg border border-gold/30 bg-[#10081c]/95 shadow-xl shadow-black/40 backdrop-blur-md">
                <div className="flex items-center gap-1.5 border-b border-gold/15 px-2.5 py-1.5">
                  {showRecent ? (
                    <Clock3 className="h-3 w-3 text-gold/70" aria-hidden />
                  ) : (
                    <TextSearch className="h-3 w-3 text-gold/70" aria-hidden />
                  )}
                  <p className="text-[10px] font-medium uppercase tracking-wide text-white/45">
                    {showRecent ? 'Recent' : 'Matches'}
                  </p>
                  <span className="ml-auto text-[10px] tabular-nums text-white/30">
                    {matches.length}
                  </span>
                </div>
                <ul
                  ref={listRef}
                  id={listId}
                  role="listbox"
                  className="max-h-44 overflow-y-auto overscroll-contain py-1"
                >
                  {matches.map((title, index) => (
                    <li
                      key={title}
                      id={`${listId}-option-${index}`}
                      role="option"
                      aria-selected={index === activeIndex}
                    >
                      <button
                        type="button"
                        tabIndex={-1}
                        className={cn(
                          'flex w-full items-center gap-2 px-2.5 py-2 text-left text-xs text-white/80 transition-colors',
                          index === activeIndex
                            ? 'bg-gold/15 text-gold'
                            : 'hover:bg-white/[0.06]',
                        )}
                        onMouseDown={(e) => {
                          // Prevent input blur; apply value immediately (don't wait for click).
                          e.preventDefault()
                          e.stopPropagation()
                          pick(title)
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <HighlightMatch text={title} query={query} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            drawerPortalHost,
          )
        : null

    return (
      <div
        ref={wrapRef}
        className={cn('relative min-w-0 w-full border-b border-gold/30 pb-1', className)}
      >
        <Input
          ref={ref}
          id={id}
          name={name}
          value={value}
          placeholder="What was this for?"
          autoComplete="off"
          role="combobox"
          aria-expanded={showMenu}
          aria-controls={showMenu ? listId : undefined}
          aria-autocomplete="list"
          aria-describedby={ariaDescribedBy}
          aria-invalid={ariaInvalid}
          aria-activedescendant={
            showMenu && activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
          }
          className="h-auto min-h-0 w-full min-w-0 border-0 bg-transparent px-0 py-0 text-base shadow-none placeholder:text-white/35 focus-visible:ring-0 focus-visible:ring-offset-0"
          onFocus={() => setOpen(true)}
          onBlur={() => {
            // Delay so suggestion onClick can run first.
            window.setTimeout(() => setOpen(false), 120)
            onBlur()
          }}
          onChange={(e) => {
            onChange(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
        />
        {menu}
      </div>
    )
  },
)
