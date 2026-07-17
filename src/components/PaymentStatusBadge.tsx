import { Badge } from '@/components/ui/badge'
import { PAYMENT_STATUS_LABEL } from '@/lib/budget'
import type { BudgetPaymentStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function PaymentStatusBadge({ status }: { status: BudgetPaymentStatus }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-sm font-medium',
        status === 'done' && 'border-gold/50 bg-gold/15 text-gold',
        status === 'pending' && 'border-white/25 bg-white/10 text-white/85',
        status === 'may_come' && 'border-gold/30 bg-transparent text-white/70',
      )}
    >
      {PAYMENT_STATUS_LABEL[status]}
    </Badge>
  )
}
