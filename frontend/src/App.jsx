import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { Layout, LoadingState, ProtectedLayout } from './components/Layout'

const AdminPage = lazy(() => import('./pages/AdminPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const BrowsePage = lazy(() => import('./pages/BrowsePage'))
const ClaimsPage = lazy(() => import('./pages/ClaimsPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const MatchesPage = lazy(() => import('./pages/MatchesPage'))
const MessagesPage = lazy(() => import('./pages/MessagesPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const ReportPage = lazy(() => import('./pages/ReportPage'))

function AdminRoute() {
  const { user } = useAuth()
  return user?.role === 'admin' ? <AdminPage /> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<LandingPage />} />
              <Route path="login" element={<AuthPage mode="login" />} />
              <Route path="register" element={<AuthPage mode="register" />} />
              <Route path="items" element={<BrowsePage />} />
              <Route path="items/:id" element={<ItemDetailPage />} />
              <Route element={<ProtectedLayout />}>
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="report/:type" element={<ReportPage />} />
                <Route path="matches" element={<MatchesPage />} />
                <Route path="claims" element={<ClaimsPage />} />
                <Route path="messages" element={<MessagesPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="admin" element={<AdminRoute />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
