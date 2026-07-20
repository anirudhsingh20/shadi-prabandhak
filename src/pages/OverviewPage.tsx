import { Link } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const links = [
  { to: '/events', title: 'Events', desc: 'Mehendi, Haldi, Sangeet, Wedding & Reception' },
  { to: '/guests', title: 'Guests', desc: 'Bride, groom & common · RSVP counts' },
  { to: '/guests-v2', title: 'Guests v2', desc: 'Simple tabs + drawer add form' },
  { to: '/budget', title: 'Budget', desc: 'Bank balance, categories & charts' },
  { to: '/payments', title: 'Payments', desc: 'Done, pending & may come' },
  { to: '/vendors', title: 'Vendors', desc: 'Contacts and booking status' },
  { to: '/checklist', title: 'Checklist', desc: 'Timeline until November' },
  { to: '/ideas', title: 'Ideas', desc: 'tldraw whiteboard for wedding ideas' },
]

export function OverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description="Guests, budget, vendors, and ceremony schedule."
      />
      <div className="grid gap-2">
        {links.map((l) => (
          <Link key={l.to} to={l.to}>
            <Card className="border-gold/30 bg-white/5 transition-colors hover:bg-gold/10">
              <CardHeader className="p-4">
                <CardTitle className="text-base text-white">{l.title}</CardTitle>
                <CardDescription className="text-sm text-white/70">{l.desc}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
