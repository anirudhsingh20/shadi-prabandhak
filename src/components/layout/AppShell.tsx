import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, LogOut } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Home', end: true },
  { to: '/events', label: 'Events' },
  { to: '/guests', label: 'Guests' },
  { to: '/budget', label: 'Budget' },
  { to: '/tracker', label: 'Tracker' },
  { to: '/vendors', label: 'Vendors' },
  { to: '/checklist', label: 'Checklist' },
  { to: '/ideas', label: 'Ideas' },
]

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              'block rounded-md px-3 py-2.5 text-base font-medium transition-colors',
              isActive
                ? 'bg-gold text-gold-foreground shadow-sm'
                : 'text-white/85 hover:bg-white/10 hover:text-gold',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
    </>
  )
}

export function AppShell() {
  const { signOut } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="wedding-bg flex min-h-dvh justify-center">
      <div className="wedding-shell flex w-full max-w-[430px] flex-col border-x border-gold/40 shadow-[0_0_48px_rgba(212,168,83,0.14)]">
        <header className="wedding-chrome sticky top-0 z-50 border-b border-gold/40">
          <div className="flex h-14 items-center justify-between gap-3 px-4">
            <Link to="/" className="font-display truncate text-xl font-semibold tracking-wide text-gold drop-shadow-sm">
              Shadi Prabandhak
            </Link>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="outline" size="icon" onClick={() => signOut()} aria-label="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setMenuOpen(true)} aria-label="Open menu">
                <Menu className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
          <DialogContent className="max-w-[min(100%,24rem)] border-gold/40 bg-[#10081c]">
            <DialogHeader>
              <DialogTitle className="font-display text-gold">Menu</DialogTitle>
            </DialogHeader>
            <nav className="flex flex-col gap-1">
              <NavItems onNavigate={() => setMenuOpen(false)} />
            </nav>
          </DialogContent>
        </Dialog>

        <main className="relative flex-1 px-4 py-5">
          <Outlet />
        </main>

        <footer className="wedding-chrome border-t border-gold/40 py-5 text-center text-sm text-white/80">
          <strong className="font-display text-base font-semibold tracking-wide text-gold">Shadi Prabandhak</strong>
          {' · '}Anjali & Anirudh · 20 November 2026
        </footer>
      </div>
    </div>
  )
}
