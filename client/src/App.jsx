import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import VerifyEmail from './pages/VerifyEmail'
import Groups from './pages/Groups'
import GroupDetail from './pages/GroupDetail'
import CreateGroup from './pages/CreateGroup'
import Invitations from './pages/Invitations'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import MyBookings from './pages/MyBookings'
import NotFound from './pages/NotFound'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  // Preserve intended destination in router state
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading GroupBuy...</p>
        </div>
      </div>
    )
  }

  // Redirect to previously intended destination or default dashboard
  if (user) {
    const destination = location.state?.from?.pathname || '/dashboard'
    return <Navigate to={destination} replace />
  }

  return children
}

export default function App() {
  return (
    <Routes>
      {/* Public landing page (redirects to /dashboard if logged in) */}
      <Route path="/" element={<GuestRoute><Landing /></GuestRoute>} />

      {/* Public auth routes */}
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/reset-password/:token" element={<GuestRoute><ResetPassword /></GuestRoute>} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />

      {/* Protected routes wrapped in Layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/groups/new" element={<CreateGroup />} />
        <Route path="/groups/:groupId" element={<GroupDetail />} />
        <Route path="/bookings" element={<MyBookings />} />
        <Route path="/invitations" element={<Invitations />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
