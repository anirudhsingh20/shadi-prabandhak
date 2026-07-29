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
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 150
const MAX_SUGGESTIONS = 6

export const SUGGEST_MENU_ATTR = 'data-suggest-menu'
export const SUGGEST_MENU_SELECTOR = `[${SUGGEST_MENU_ATTR}]`

export function isSuggestMenuTarget(target: EventTarget | null) {
  return target instanceof Element && target.closest(SUGGEST_MENU_SELECTOR) !== null
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

function filterSuggestions(query: string, suggestions: string[]) {
  const q = query.trim().toLowerCase()
  if (!q) return suggestions.slice(0, MAX_SUGGESTIONS)

  return suggestions
    .filter((item) => {
      const lower = item.toLowerCase()
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

type SuggestInputProps = {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
  suggestions: string[]
  placeholder?: string
  className?: string
  inputClassName?: string
  id?: string
  'aria-describedby'?: string
  'aria-invalid'?: boolean
  /** Portal root; defaults to document.body with fixed positioning */
  portalHost?: HTMLElement | null
}

export const SuggestInput = forwardRef<HTMLInputElement, SuggestInputProps>(
  function SuggestInput(
    {
      value,
      onChange,
      onBlur,
      name,
      suggestions,
      placeholder = 'Type to search…',
      className,
      inputClassName,
      id,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      portalHost = null,
    },
    ref,
  ) {
    const reactId = useId()
    const wrapRef = useRef<HTMLDivElement>(null)
    const listRef = useRef<HTMLUListElement>(null)
    const [focused, setFocused] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [menuRect, setMenuRect] = useState<{
      top: number
      left: number
      width: number
      strategy: 'absolute' | 'fixed'
    } | null>(null)
    const debouncedQuery = useDebouncedValue(value, DEBOUNCE_MS)
    const query = debouncedQuery.trim()

    const matches = useMemo(
      () => filterSuggestions(debouncedQuery, suggestions),
      [debouncedQuery, suggestions],
    )

    const showMenu = focused && matches.length > 0
    const showRecent = query.length === 0
    const listId = `${name || reactId}-suggestions`
    const host = portalHost

    const updateMenuRect = () => {
      const anchor = wrapRef.current
      if (!anchor) return
      const a = anchor.getBoundingClientRect()

      if (host) {
        const h = host.getBoundingClientRect()
        setMenuRect({
          top: a.bottom - h.top + 6,
          left: a.left - h.left,
          width: Math.max(a.width, 220),
          strategy: 'absolute',
        })
        return
      }

      setMenuRect({
        top: a.bottom + 6,
        left: a.left,
        width: Math.max(a.width, 220),
        strategy: 'fixed',
      })
    }

    useLayoutEffect(() => {
      if (!showMenu) {
        setMenuRect(null)
        return
      }
      updateMenuRect()
    }, [showMenu, value, matches.length, host])

    useEffect(() => {
      if (!showMenu) return
      const onLayoutChange = () => updateMenuRect()
      window.addEventListener('resize', onLayoutChange)
      window.addEventListener('scroll', onLayoutChange, true)
      return () => {
        window.removeEventListener('resize', onLayoutChange)
        window.removeEventListener('scroll', onLayoutChange, true)
      }
    }, [showMenu, host])

    useEffect(() => {
      setActiveIndex(-1)
    }, [debouncedQuery, matches.length])

    useEffect(() => {
      if (activeIndex < 0 || !listRef.current) return
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined
      item?.scrollIntoView({ block: 'nearest' })
    }, [activeIndex])

    const pick = (item: string) => {
      onChange(item)
      setFocused(false)
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
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        setFocused(false)
        setActiveIndex(-1)
      }
    }

    const menu =
      showMenu && menuRect
        ? createPortal(
            <div
              {...{ [SUGGEST_MENU_ATTR]: '' }}
              className={cn(
                'z-[200] animate-in fade-in-0 slide-in-from-top-1 duration-150',
                menuRect.strategy === 'fixed' ? 'fixed' : 'absolute',
              )}
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
                  {matches.map((item, index) => (
                    <li
                      key={item}
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
                          e.preventDefault()
                          e.stopPropagation()
                          pick(item)
                        }}
                        onMouseEnter={() => setActiveIndex(index)}
                      >
                        <span className="min-w-0 flex-1 truncate">
                          <HighlightMatch text={item} query={query} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>,
            host ?? document.body,
          )
        : null

    return (
      <div ref={wrapRef} className={cn('relative min-w-0', className)}>
        <Input
          ref={ref}
          id={id}
          name={name}
          value={value}
          placeholder={placeholder}
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
          className={inputClassName}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            window.setTimeout(() => setFocused(false), 120)
            onBlur?.()
          }}
          onChange={(e) => {
            onChange(e.target.value)
            setFocused(true)
          }}
          onKeyDown={onKeyDown}
        />
        {menu}
      </div>
    )
  },
)
