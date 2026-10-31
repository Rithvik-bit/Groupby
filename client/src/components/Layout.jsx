import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import {
  LayoutDashboard, Users, Plus, User, LogOut,
  Bell, Menu, X, Wifi, WifiOff, ChevronRight, Mail, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/groups', icon: Users, label: 'Discover Groups' },
  { to: '/bookings', icon: Calendar, label: 'My Bookings' },
  { to: '/invitations', icon: Mail, label: 'Invitations' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile', icon: User, label: 'Profile' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out successfully')
    navigate('/login')
  }

  const initials = user?.displayName
    ? user.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : user?.username?.slice(0, 2).toUpperCase() || 'GB'

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* ── Sidebar ────────────────────────────────────────────────── */}
      <>
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 lg:hidden"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-0 left-0 h-full z-30 transition-transform duration-300 flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
          style={{
            width: '260px',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
          }}
        >
          {/* Logo */}
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'var(--gradient-primary)' }}
              >
                GB
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>GroupBuy</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Share. Build. Own.</div>
              </div>
            </div>
            <button
              className="lg:hidden p-1 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive
                    ? 'text-white'
                    : 'hover:bg-white/5'
                  }`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(99,102,241,0.15)' : undefined,
                  color: isActive ? '#818cf8' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                })}
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}

            {/* Create group CTA */}
            <div className="pt-3">
              <NavLink
                to="/groups/new"
                onClick={() => setSidebarOpen(false)}
                className="btn-primary w-full justify-center"
                style={{ justifyContent: 'center' }}
              >
                <Plus size={16} />
                New Group
              </NavLink>
            </div>
          </nav>

          {/* Bottom: user info + connection status */}
          <div className="p-4" style={{ borderTop: '1px solid var(--border)' }}>
            {/* Connection status */}
            <div className="flex items-center gap-2 mb-3">
              {connected
                ? <Wifi size={13} color="#10b981" />
                : <WifiOff size={13} color="#6b6b80" />
              }
              <span className="text-xs" style={{ color: connected ? '#10b981' : 'var(--text-secondary)' }}>
                {connected ? 'Real-time connected' : 'Offline'}
              </span>
            </div>

            <div className="flex items-center gap-3 p-2 rounded-xl" style={{ background: 'var(--bg-card)' }}>
              <div className="avatar avatar-sm" style={{ flexShrink: 0 }}>
                {user?.avatarUrl
                  ? <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : initials
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {user?.displayName || user?.username}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                  {user?.email}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg transition-colors hover:bg-red-500/10"
                title="Log out"
              >
                <LogOut size={15} color="#ef4444" />
              </button>
            </div>
          </div>
        </aside>
      </>

      {/* ── Main content ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header
          className="lg:hidden flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg"
            style={{ background: 'var(--bg-card)' }}
          >
            <Menu size={18} style={{ color: 'var(--text-primary)' }} />
          </button>
          <div className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>GroupBuy</div>
          <NavLink to="/profile" className="avatar avatar-sm text-xs">{initials}</NavLink>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
