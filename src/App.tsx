import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/hooks/useAuth'
import { BudgetPage } from '@/pages/BudgetPage'
import { ChecklistPage } from '@/pages/ChecklistPage'
import { EventsPage } from '@/pages/EventsPage'
import { GuestsPage } from '@/pages/GuestsPage'
import { GuestsV2Page } from '@/pages/GuestsV2Page'
import { FamilyTreePage } from '@/pages/FamilyTreePage'
import { HomePage } from '@/pages/HomePage'
import { IdeasPage } from '@/pages/IdeasPage'
import { LoginPage } from '@/pages/LoginPage'
import { OverviewPage } from '@/pages/OverviewPage'
import { PaymentsPage } from '@/pages/PaymentsPage'
import { VendorsPage } from '@/pages/VendorsPage'

const queryClient = new QueryClient()

/** Vite `base` without trailing slash — required for GitHub Pages project sites. */
const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter basename={routerBasename}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="guests" element={<GuestsV2Page />} />
              <Route path="guests-classic" element={<GuestsPage />} />
              <Route path="guests-v2" element={<Navigate to="/guests" replace />} />
              <Route path="family-tree" element={<FamilyTreePage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="tracker" element={<Navigate to="/payments" replace />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="checklist" element={<ChecklistPage />} />
              <Route path="ideas" element={<IdeasPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-center" />
      </AuthProvider>
    </QueryClientProvider>
  )
}
