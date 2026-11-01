import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import OnboardingModal from './OnboardingModal'
import Logo from './Logo'
import {
  LayoutDashboard, Users, Plus, LogOut,
  Bell, Menu, X, Wifi, WifiOff, HelpCircle,
  Mail, Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/groups', icon: Users, label: 'Groups' },
  { to: '/bookings', icon: Calendar, label: 'My Bookings' },
  { to: '/invitations', icon: Mail, label: 'Invitations' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [onboardingOpen, setOnboardingOpen] = useState(false)

  // Auto-launch onboarding modal once for first-time sessions
  useEffect(() => {
    const hidden = localStorage.getItem('groupbuy_hide_onboarding')
    if (!hidden) {
      setOnboardingOpen(true)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    toast.success('Logged out')
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
            className="fixed inset-0 z-20 lg:hidden bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <aside
          className={`fixed top-0 left-0 h-full z-30 transition-transform duration-200 flex flex-col
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}
          style={{
            width: '240px',
            background: 'var(--bg-secondary)',
            borderRight: '1px solid var(--border)',
          }}
        >
          {/* Logo */}
          <div className="p-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border)' }}>
            <Logo variant="full" size="sm" to="/dashboard" />
            <button
              className="lg:hidden p-1 rounded text-zinc-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors
                  ${isActive
                    ? 'bg-zinc-800/80 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'}`
                }
              >
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ))}

            <div className="pt-3">
              <NavLink
                to="/groups/new"
                onClick={() => setSidebarOpen(false)}
                className="btn-primary w-full justify-center text-xs py-2"
              >
                <Plus size={14} />
                Create Group
              </NavLink>
            </div>
          </nav>

          {/* Bottom user & guide panel */}
          <div className="p-3 border-t space-y-2 text-xs" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => setOnboardingOpen(true)}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors text-left"
            >
              <HelpCircle size={14} className="text-zinc-400" />
              <span>Platform Guide</span>
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1 text-[11px] text-zinc-500">
              {connected
                ? <Wifi size={12} className="text-emerald-500" />
                : <WifiOff size={12} className="text-zinc-500" />
              }
              <span>{connected ? 'Live sync connected' : 'Connecting...'}</span>
            </div>

            {/* User row */}
            <div className="flex items-center justify-between p-2 rounded bg-zinc-900 border border-zinc-800/80">
              <NavLink to="/profile" className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90">
                <div className="avatar avatar-sm text-[11px]">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">
                    {user?.displayName || user?.username}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {user?.email}
                  </div>
                </div>
              </NavLink>

              <button
                onClick={handleLogout}
                className="p-1.5 rounded hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors ml-1"
                title="Log out"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </aside>
      </>

      {/* ── Main Content Area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header */}
        <header
          className="hidden lg:flex items-center justify-between px-6 py-2.5 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <div className="flex items-center gap-3 text-xs text-zinc-400">
            <span className="text-zinc-300 font-medium">Accounting: <span className="font-mono text-zinc-400">Integer Paise</span></span>
            <span>·</span>
            <span className="text-zinc-300 font-medium">Equity: <span className="font-mono text-zinc-400">10,000 Basis Points</span></span>
            <span>·</span>
            <span className="text-zinc-500 text-[11px]">Simulated sandbox</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOnboardingOpen(true)}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
            >
              <HelpCircle size={14} />
              <span>Guide</span>
            </button>

            <NavLink to="/profile" className="avatar avatar-sm text-[11px]">
              {initials}
            </NavLink>
          </div>
        </header>

        {/* Mobile Header */}
        <header
          className="lg:hidden flex items-center justify-between p-3.5 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded text-zinc-300"
          >
            <Menu size={18} />
          </button>
          <Logo variant="full" size="xs" to="/dashboard" />
          <NavLink to="/profile" className="avatar avatar-sm text-xs">{initials}</NavLink>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </div>
  )
}
