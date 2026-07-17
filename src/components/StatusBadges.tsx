import { Check, Clock, Users, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { ChecklistStatus, GuestSide, RsvpStatus, VendorStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import brideImg from '@/assets/bride.png'
import groomImg from '@/assets/groom.png'
import commonImg from '@/assets/common.png'

const sideImages: Record<GuestSide, string> = {
  bride: brideImg,
  groom: groomImg,
  common: commonImg,
}

export function SideIcon({ side, className }: { side: GuestSide; className?: string }) {
  return (
    <img
      src={sideImages[side]}
      alt=""
      aria-hidden
      className={cn('h-5 w-5 shrink-0 object-contain', className)}
    />
  )
}

const guestTagClass = 'gap-1.5 px-2.5 py-1 text-sm font-medium'

export function RsvpBadge({ status, iconOnly = false }: { status: RsvpStatus; iconOnly?: boolean }) {
  const map: Record<RsvpStatus, { label: string; icon: typeof Check; className: string }> = {
    confirmed: {
      label: 'Confirmed',
      icon: Check,
      className: 'border-gold/50 bg-gold/15 text-gold',
    },
    pending: {
      label: 'Pending',
      icon: Clock,
      className: 'border-white/25 bg-white/10 text-white/80',
    },
    declined: {
      label: 'Declined',
      icon: X,
      className: 'border-white/20 bg-transparent text-white/60',
    },
  }
  const { label, icon: Icon, className } = map[status]
  return (
    <Badge
      variant="outline"
      title={label}
      aria-label={label}
      className={cn(guestTagClass, iconOnly && 'px-1.5', className)}
    >
      <Icon className="h-3.5 w-3.5" />
      {!iconOnly && label}
    </Badge>
  )
}

export function VendorBadge({ status }: { status: VendorStatus }) {
  return (
    <Badge variant={status === 'booked' ? 'default' : 'secondary'}>
      {status === 'booked' ? 'Booked' : 'Shortlisted'}
    </Badge>
  )
}

export function SideBadge({ side }: { side: GuestSide }) {
  const labels: Record<GuestSide, string> = {
    bride: 'Bride',
    groom: 'Groom',
    common: 'Common',
  }
  return (
    <Badge
      variant="outline"
      className={cn(guestTagClass, side === 'common' && 'bg-muted/60')}
    >
      <SideIcon side={side} className="h-4 w-4" />
      {labels[side]}
    </Badge>
  )
}

export function HeadcountBadge({ count }: { count: number }) {
  return (
    <Badge variant="outline" className={cn(guestTagClass, 'border-gold/40 bg-gold/10 tabular-nums text-gold')}>
      <Users className="h-3.5 w-3.5" />
      {count}
    </Badge>
  )
}

export function ChecklistBadge({ status }: { status: ChecklistStatus }) {
  const labels = { done: 'Done', next: 'Next', later: 'Later' }
  const variants = { done: 'secondary' as const, next: 'default' as const, later: 'outline' as const }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
