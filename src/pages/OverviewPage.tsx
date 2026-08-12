import { Link } from 'react-router-dom'
import {
  CalendarDays,
  CheckSquare,
  ChevronRight,
  GitFork,
  Lightbulb,
  ListTodo,
  LogOut,
  Store,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/PageHeader'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

type OverviewLink = {
  to: string
  title: string
  icon: LucideIcon
}

type OverviewGroup = {
  label: string
  items: OverviewLink[]
}

const groups: OverviewGroup[] = [
  {
    label: 'People',
    items: [
      { to: '/guests', title: 'Guests', icon: Users },
      { to: '/family-tree', title: 'Family tree', icon: GitFork },
    ],
  },
  {
    label: 'Plan',
    items: [
      { to: '/events', title: 'Events', icon: CalendarDays },
      { to: '/checklist', title: 'Checklist', icon: CheckSquare },
      { to: '/decisions', title: 'Decisions', icon: ListTodo },
      { to: '/ideas', title: 'Ideas', icon: Lightbulb },
      { to: '/vendors', title: 'Vendors', icon: Store },
    ],
  },
  {
    label: 'Money',
    items: [{ to: '/money-in-bank', title: 'Money in bank', icon: Wallet }],
  },
]

export function OverviewPage() {
  const { signOut } = useAuth()

  return (
    <div className="space-y-5">
      <PageHeader title="Overview" />

      <div className="space-y-4">
        {groups.map((group) => (
          <section key={group.label} className="space-y-1.5">
            <h2 className="px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/40">
              {group.label}
            </h2>
            <div className="overflow-hidden rounded-lg border border-gold/25 bg-white/[0.03]">
              {group.items.map((item, index) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gold/10',
                      index > 0 && 'border-t border-white/[0.06]',
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-gold/80" />
                    <span className="min-w-0 flex-1 text-sm font-medium text-white/90">
                      {item.title}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-white/30 transition-colors group-hover:text-gold" />
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <button
        type="button"
        onClick={() => void signOut()}
        className="flex w-full items-center justify-center gap-2 px-3 py-2 text-sm text-white/45 transition-colors hover:text-gold"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        Log out
      </button>
    </div>
  )
}
