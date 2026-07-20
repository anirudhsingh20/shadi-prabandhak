import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  CalendarDays,
  CheckSquare,
  GitFork,
  Home,
  IndianRupee,
  LayoutGrid,
  Lightbulb,
  ListChecks,
  LogOut,
  MoreHorizontal,
  Store,
  Users,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

type TabItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const primaryTabs: TabItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/guests', label: 'Guests', icon: Users },
  { to: '/payments', label: 'Payments', icon: ListChecks },
  { to: '/overview', label: 'Overview', icon: LayoutGrid },
]

const moreItems: TabItem[] = [
  { to: '/guests-classic', label: 'Guests classic', icon: Users },
  { to: '/family-tree', label: 'Family tree', icon: GitFork },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/budget', label: 'Budget', icon: IndianRupee },
  { to: '/vendors', label: 'Vendors', icon: Store },
  { to: '/checklist', label: 'Checklist', icon: CheckSquare },
  { to: '/ideas', label: 'Ideas', icon: Lightbulb },
]

const morePaths = new Set(moreItems.map((item) => item.to))

export function AppShell() {
  const { signOut } = useAuth()
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreActive = morePaths.has(location.pathname)

  return (
    <div className="wedding-bg flex min-h-dvh justify-center">
      <div className="wedding-shell flex w-full max-w-[430px] flex-col border-x border-gold/40 shadow-[0_0_48px_rgba(212,168,83,0.14)]">
        <main className="relative flex-1 px-4 py-5 pb-24">
          <Outlet />
        </main>

        <nav
          className="wedding-chrome fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-x border-gold/40 pb-[env(safe-area-inset-bottom)]"
          aria-label="Primary"
        >
          <div className="grid h-16 grid-cols-5">
            {primaryTabs.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                      isActive ? 'text-gold' : 'text-white/55 hover:text-white/85',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={cn('h-5 w-5', isActive && 'drop-shadow-[0_0_6px_rgba(212,168,83,0.45)]')} />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              )
            })}
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors',
                moreActive ? 'text-gold' : 'text-white/55 hover:text-white/85',
              )}
              aria-label="More"
            >
              <MoreHorizontal
                className={cn('h-5 w-5', moreActive && 'drop-shadow-[0_0_6px_rgba(212,168,83,0.45)]')}
              />
              <span>More</span>
            </button>
          </div>
        </nav>

        <Dialog open={moreOpen} onOpenChange={setMoreOpen}>
          <DialogContent className="max-w-[min(100%,24rem)] border-gold/40 bg-[#10081c]">
            <DialogHeader>
              <DialogTitle className="font-display text-gold">More</DialogTitle>
            </DialogHeader>
            <nav className="grid gap-1">
              {moreItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium transition-colors',
                        isActive
                          ? 'bg-gold text-gold-foreground shadow-sm'
                          : 'text-white/85 hover:bg-white/10 hover:text-gold',
                      )
                    }
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {item.label}
                  </NavLink>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  setMoreOpen(false)
                  void signOut()
                }}
                className="flex items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-white/85 transition-colors hover:bg-white/10 hover:text-gold"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                Log out
              </button>
            </nav>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
