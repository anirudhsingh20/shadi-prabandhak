import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase, WEDDING_ID } from '@/lib/supabase'
import type { Guest, GuestRelation, GuestSide } from '@/lib/types'
import { cn } from '@/lib/utils'

type SideFilter = GuestSide

const SIDE_ORDER: SideFilter[] = ['groom', 'bride', 'common']

const SIDE_LABEL: Record<SideFilter, string> = {
  groom: 'Groom Side',
  bride: 'Bride Side',
  common: 'Mutual',
}

const RELATION_ORDER: GuestRelation[] = ['father', 'mother', 'friends', 'other']

const RELATION_LABEL: Record<GuestRelation, string> = {
  father: 'Father',
  mother: 'Mother',
  friends: 'Friends',
  other: 'Other',
}

function pax(g: Pick<Guest, 'headcount'>) {
  return Math.max(1, Number(g.headcount) || 1)
}

function sumGuests(list: Guest[]) {
  return list.reduce((n, g) => n + pax(g), 0)
}

type TreeGuest = { id: string; name: string; count: number }
type TreeRelation = { key: GuestRelation; label: string; total: number; guests: TreeGuest[] }
type TreeSide = { key: SideFilter; label: string; total: number; relations: TreeRelation[] }

function buildTree(guests: Guest[], sides: SideFilter[]): TreeSide[] {
  return sides.map((side) => {
    const sideGuests = guests.filter((g) => g.side === side)
    const relations = RELATION_ORDER.map((relation) => {
      const list = sideGuests
        .filter((g) => g.relation === relation)
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((g) => ({ id: g.id, name: g.name, count: pax(g) }))
      return {
        key: relation,
        label: RELATION_LABEL[relation],
        total: list.reduce((n, g) => n + g.count, 0),
        guests: list,
      }
    })
    return {
      key: side,
      label: SIDE_LABEL[side],
      total: sumGuests(sideGuests),
      relations,
    }
  })
}

/* —— layout constants —— */
const PAD = 24
const ROOT_W = 120
const ROOT_H = 36
const SIDE_W = 128
const SIDE_H = 40
const REL_W = 110
const REL_H = 42
const GUEST_W = 120
const GUEST_H = 32
const V1 = 56 // root → side
const V2 = 52 // side → relation
const V3 = 10 // relation → first guest
const GUEST_GAP = 6
const REL_GAP = 18
const SIDE_GAP = 40

type Box = { id: string; label: string; sub?: string; x: number; y: number; w: number; h: number; kind: 'root' | 'side' | 'rel' | 'guest' }
type Edge = { x1: number; y1: number; x2: number; y2: number }

function layoutTree(sides: TreeSide[]): { boxes: Box[]; edges: Edge[]; width: number; height: number } {
  const boxes: Box[] = []
  const edges: Edge[] = []

  // Measure each side column width
  const sideLayouts = sides.map((side) => {
    const relWidths = side.relations.map((rel) => {
      const guestBlock = rel.guests.length * GUEST_H + Math.max(0, rel.guests.length - 1) * GUEST_GAP
      const colW = Math.max(REL_W, GUEST_W)
      const colH = REL_H + (rel.guests.length ? V3 + guestBlock : 0)
      return { rel, colW, colH }
    })
    const relationsWidth =
      relWidths.reduce((n, r) => n + r.colW, 0) + Math.max(0, relWidths.length - 1) * REL_GAP
    const width = Math.max(SIDE_W, relationsWidth)
    const height =
      SIDE_H +
      V2 +
      (relWidths.length ? Math.max(...relWidths.map((r) => r.colH)) : 0)
    return { side, relWidths, width, height, relationsWidth }
  })

  const sidesWidth =
    sideLayouts.reduce((n, s) => n + s.width, 0) + Math.max(0, sideLayouts.length - 1) * SIDE_GAP
  const contentWidth = Math.max(ROOT_W, sidesWidth)
  const width = contentWidth + PAD * 2

  const rootX = PAD + (contentWidth - ROOT_W) / 2
  const rootY = PAD
  boxes.push({
    id: 'root',
    label: 'Wedding',
    x: rootX,
    y: rootY,
    w: ROOT_W,
    h: ROOT_H,
    kind: 'root',
  })

  const rootCx = rootX + ROOT_W / 2
  const rootBottom = rootY + ROOT_H
  const sideBarY = rootBottom + V1 / 2

  const sidesTop = rootBottom + V1
  let sideCursorX = PAD + (contentWidth - sidesWidth) / 2
  const sideCenters: number[] = []

  // Root drop line
  edges.push({ x1: rootCx, y1: rootBottom, x2: rootCx, y2: sideBarY })

  sideLayouts.forEach(({ side, relWidths, width: sideColW, relationsWidth }) => {
    const sideX = sideCursorX + (sideColW - SIDE_W) / 2
    const sideY = sidesTop
    const sideCx = sideX + SIDE_W / 2
    sideCenters.push(sideCx)

    boxes.push({
      id: `side-${side.key}`,
      label: side.label,
      sub: String(side.total),
      x: sideX,
      y: sideY,
      w: SIDE_W,
      h: SIDE_H,
      kind: 'side',
    })

    // bar → side
    edges.push({ x1: sideCx, y1: sideBarY, x2: sideCx, y2: sideY })

    const relTop = sideY + SIDE_H + V2
    const relBarY = sideY + SIDE_H + V2 / 2
    let relCursorX = sideCursorX + (sideColW - relationsWidth) / 2
    const relCenters: number[] = []

    // Side drop to relation bar
    edges.push({ x1: sideCx, y1: sideY + SIDE_H, x2: sideCx, y2: relBarY })

    relWidths.forEach(({ rel, colW }) => {
      const relX = relCursorX + (colW - REL_W) / 2
      const relY = relTop
      const relCx = relX + REL_W / 2
      relCenters.push(relCx)

      boxes.push({
        id: `rel-${side.key}-${rel.key}`,
        label: rel.label,
        sub: String(rel.total),
        x: relX,
        y: relY,
        w: REL_W,
        h: REL_H,
        kind: 'rel',
      })

      edges.push({ x1: relCx, y1: relBarY, x2: relCx, y2: relY })

      if (rel.guests.length > 0) {
        const firstY = relY + REL_H + V3
        edges.push({ x1: relCx, y1: relY + REL_H, x2: relCx, y2: firstY })

        let guestY = firstY
        rel.guests.forEach((g) => {
          const gx = relCursorX + (colW - GUEST_W) / 2
          boxes.push({
            id: `guest-${g.id}`,
            label: g.name,
            sub: String(g.count),
            x: gx,
            y: guestY,
            w: GUEST_W,
            h: GUEST_H,
            kind: 'guest',
          })
          guestY += GUEST_H + GUEST_GAP
        })
      }

      relCursorX += colW + REL_GAP
    })

    if (relCenters.length > 1) {
      edges.push({
        x1: Math.min(...relCenters),
        y1: relBarY,
        x2: Math.max(...relCenters),
        y2: relBarY,
      })
    }

    sideCursorX += sideColW + SIDE_GAP
  })

  if (sideCenters.length > 1) {
    edges.push({
      x1: Math.min(...sideCenters),
      y1: sideBarY,
      x2: Math.max(...sideCenters),
      y2: sideBarY,
    })
  }

  const height = Math.max(...boxes.map((b) => b.y + b.h), PAD) + PAD

  return { boxes, edges, width, height }
}

function TreeNode({ box }: { box: Box }) {
  const isRoot = box.kind === 'root'
  const isSide = box.kind === 'side'
  const isRel = box.kind === 'rel'
  const isGuest = box.kind === 'guest'

  return (
    <g transform={`translate(${box.x}, ${box.y})`}>
      <rect
        width={box.w}
        height={box.h}
        rx={isGuest ? 4 : 6}
        className={cn(
          isRoot && 'fill-gold/20 stroke-gold/60',
          isSide && 'fill-white/10 stroke-gold/45',
          isRel && 'fill-[#10081c] stroke-gold/35',
          isGuest && 'fill-transparent stroke-white/20',
        )}
        strokeWidth={1}
      />
      <text
        x={box.w / 2}
        y={box.sub ? box.h / 2 - 5 : box.h / 2 + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className={cn(
          isRoot && 'fill-gold font-semibold',
          isSide && 'fill-white/90',
          isRel && 'fill-white/85',
          isGuest && 'fill-white/75',
        )}
        style={{ fontSize: isGuest ? 9 : isRel ? 10 : 11, fontFamily: 'inherit' }}
      >
        {box.label.length > 16 && isGuest ? `${box.label.slice(0, 15)}…` : box.label}
      </text>
      {box.sub && (
        <text
          x={box.w / 2}
          y={box.h / 2 + 9}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white/45"
          style={{ fontSize: 9, fontFamily: 'inherit' }}
        >
          {box.sub}
        </text>
      )}
    </g>
  )
}

function useDragPan(ref: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let dragging = false
    let startX = 0
    let startY = 0
    let originLeft = 0
    let originTop = 0

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      dragging = true
      startX = e.clientX
      startY = e.clientY
      originLeft = el.scrollLeft
      originTop = el.scrollTop
      el.setPointerCapture(e.pointerId)
      el.classList.add('cursor-grabbing')
      el.classList.remove('cursor-grab')
    }

    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      e.preventDefault()
      el.scrollLeft = originLeft - (e.clientX - startX)
      el.scrollTop = originTop - (e.clientY - startY)
    }

    const onUp = (e: PointerEvent) => {
      if (!dragging) return
      dragging = false
      el.classList.remove('cursor-grabbing')
      el.classList.add('cursor-grab')
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
    }
  }, [ref])
}

export function FamilyTreePage() {
  const [filter, setFilter] = useState<SideFilter | 'all'>('all')
  const panRef = useRef<HTMLDivElement>(null)
  useDragPan(panRef)

  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests'],
    queryFn: async () => {
      const { data, error } = await supabase.from('guests').select('*').eq('wedding_id', WEDDING_ID)
      if (error) throw error
      return data as Guest[]
    },
  })

  const sides = useMemo(() => {
    const keys = filter === 'all' ? SIDE_ORDER : [filter]
    return buildTree(guests, keys)
  }, [guests, filter])

  const layout = useMemo(() => layoutTree(sides), [sides])

  const total = useMemo(() => sumGuests(guests), [guests])

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" asChild>
          <Link to="/guests" aria-label="Back to guests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="font-display text-lg font-semibold tracking-wide text-gold">Family tree</h1>
          <p className="text-xs text-white/55">{total} people · drag to pan</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1">
        {(
          [
            { value: 'all' as const, label: 'All' },
            { value: 'groom' as const, label: 'Groom' },
            { value: 'bride' as const, label: 'Bride' },
            { value: 'common' as const, label: 'Mutual' },
          ]
        ).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setFilter(opt.value)}
            className={cn(
              'rounded-md border py-2 text-xs font-medium transition-colors',
              filter === opt.value
                ? 'border-transparent bg-gold text-gold-foreground'
                : 'border-gold/30 text-white/70 hover:bg-white/5',
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div
        ref={panRef}
        className="cursor-grab overflow-auto overscroll-contain rounded-lg border border-gold/30 bg-[#0a0514] active:cursor-grabbing"
        style={{
          height: 'calc(100dvh - 11rem)',
          maxHeight: 'calc(100dvh - 11rem)',
          touchAction: 'none',
          WebkitOverflowScrolling: 'touch',
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(212,168,83,0.1) 1px, transparent 0)',
          backgroundSize: '16px 16px',
        }}
      >
        {isLoading && <p className="py-16 text-center text-sm text-white/50">Loading…</p>}

        {!isLoading && guests.length === 0 && (
          <p className="py-16 text-center text-sm text-white/50">No guests yet.</p>
        )}

        {!isLoading && guests.length > 0 && (
          <div
            style={{
              width: Math.max(layout.width, 1),
              height: Math.max(layout.height, 1),
            }}
          >
            <svg
              width={layout.width}
              height={layout.height}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
              className="block select-none"
              role="img"
              aria-label="Wedding family tree"
            >
              {layout.edges.map((e, i) => (
                <line
                  key={i}
                  x1={e.x1}
                  y1={e.y1}
                  x2={e.x2}
                  y2={e.y2}
                  className="stroke-gold/35"
                  strokeWidth={1}
                />
              ))}
              {layout.boxes.map((box) => (
                <TreeNode key={box.id} box={box} />
              ))}
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
