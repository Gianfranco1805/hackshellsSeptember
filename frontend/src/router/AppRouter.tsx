import { Navigate, Route, Routes } from 'react-router-dom'
import { BottomNav } from '../components/BottomNav'
import { ProtectedRoute } from '../components/ProtectedRoute'
import { TopBar } from '../components/TopBar'
import { ActiveWalkPage } from '../pages/ActiveWalkPage'
import { ContactViewPage } from '../pages/ContactViewPage'
import { ContactsPage } from '../pages/ContactsPage'
import { LoginPage } from '../pages/LoginPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SignUpPage } from '../pages/SignUpPage'
import { StartWalkPage } from '../pages/StartWalkPage'

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh bg-app-bg">
      <TopBar />
      {children}
      <BottomNav />
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/status/:shareToken" element={<ContactViewPage />} />
      <Route path="/contact/:sessionId" element={<ContactViewPage />} />
      <Route
        path="/contacts"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ContactsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AppLayout>
              <SettingsPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/start-walk"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StartWalkPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/walk"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ActiveWalkPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/walk" replace />} />
      <Route path="*" element={<Navigate to="/walk" replace />} />
    </Routes>
  )
}
