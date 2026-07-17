import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthProvider } from '@/hooks/useAuth'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { BudgetPage } from '@/pages/BudgetPage'
import { ChecklistPage } from '@/pages/ChecklistPage'
import { EventsPage } from '@/pages/EventsPage'
import { GuestsPage } from '@/pages/GuestsPage'
import { HomePage } from '@/pages/HomePage'
import { IdeasPage } from '@/pages/IdeasPage'
import { LoginPage } from '@/pages/LoginPage'
import { TrackerPage } from '@/pages/TrackerPage'
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
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppShell />
                </ProtectedRoute>
              }
            >
              <Route index element={<HomePage />} />
              <Route path="events" element={<EventsPage />} />
              <Route path="guests" element={<GuestsPage />} />
              <Route path="budget" element={<BudgetPage />} />
              <Route path="tracker" element={<TrackerPage />} />
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
