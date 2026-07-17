import { Badge } from '@/components/ui/badge'
import type { ChecklistStatus, GuestSide, RsvpStatus, VendorStatus } from '@/lib/types'

export function RsvpBadge({ status }: { status: RsvpStatus }) {
  const map: Record<RsvpStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    confirmed: { label: 'Confirmed', variant: 'default' },
    pending: { label: 'Pending', variant: 'secondary' },
    declined: { label: 'Declined', variant: 'destructive' },
  }
  const { label, variant } = map[status]
  return <Badge variant={variant}>{label}</Badge>
}

export function VendorBadge({ status }: { status: VendorStatus }) {
  return (
    <Badge variant={status === 'booked' ? 'default' : 'secondary'}>
      {status === 'booked' ? 'Booked' : 'Shortlisted'}
    </Badge>
  )
}

export function SideBadge({ side }: { side: GuestSide }) {
  return <Badge variant="outline">{side === 'bride' ? 'Bride' : 'Groom'}</Badge>
}

export function ChecklistBadge({ status }: { status: ChecklistStatus }) {
  const labels = { done: 'Done', next: 'Next', later: 'Later' }
  const variants = { done: 'secondary' as const, next: 'default' as const, later: 'outline' as const }
  return <Badge variant={variants[status]}>{labels[status]}</Badge>
}
