import { NavLink, Outlet } from 'react-router-dom'
import { Home, IndianRupee, LayoutGrid, ListChecks } from 'lucide-react'
import type { ComponentType } from 'react'
import { cn } from '@/lib/utils'

type TabItem = {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
  end?: boolean
}

const primaryTabs: TabItem[] = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/budget', label: 'Budget', icon: IndianRupee },
  { to: '/payments', label: 'Payments', icon: ListChecks },
  { to: '/overview', label: 'Overview', icon: LayoutGrid },
]

export function AppShell() {
  return (
    <div className="wedding-bg flex min-h-dvh justify-center">
      <div className="wedding-shell flex w-full max-w-[430px] flex-col border-x border-gold/40 shadow-[0_0_48px_rgba(212,168,83,0.14)]">
        <main className="relative flex-1 px-4 py-3 pb-24">
          <Outlet />
        </main>

        <nav
          className="wedding-chrome fixed bottom-0 left-1/2 z-50 w-full max-w-[430px] -translate-x-1/2 border-t border-x border-gold/40 pb-[env(safe-area-inset-bottom)]"
          aria-label="Primary"
        >
          <div className="grid h-16 grid-cols-4">
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
          </div>
        </nav>
      </div>
    </div>
  )
}
