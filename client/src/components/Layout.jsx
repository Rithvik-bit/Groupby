import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import OnboardingModal from './OnboardingModal'
import {
  LayoutDashboard, Users, Plus, User, LogOut,
  Bell, Menu, X, Wifi, WifiOff, HelpCircle,
  Coins, PieChart, Sparkles, ChevronRight, Mail, Calendar
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
            <NavLink to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20"
                style={{ background: 'var(--gradient-primary)' }}
              >
                GB
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  GroupBuy
                  <span className="badge badge-primary text-[9px] py-0 px-1 font-mono">v1.0</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Share. Build. Own.</div>
              </div>
            </NavLink>
            <button
              className="lg:hidden p-1 rounded-lg"
              style={{ color: 'var(--text-secondary)' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive ? 'text-white' : 'hover:bg-white/5'}`
                }
                style={({ isActive }) => ({
                  background: isActive ? 'rgba(99,102,241,0.15)' : undefined,
                  color: isActive ? '#818cf8' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(99,102,241,0.25)' : '1px solid transparent',
                })}
              >
                <Icon size={17} />
                <span>{label}</span>
              </NavLink>
            ))}

            {/* Create group CTA */}
            <div className="pt-3">
              <NavLink
                to="/groups/new"
                onClick={() => setSidebarOpen(false)}
                className="btn-primary w-full justify-center shadow-lg shadow-indigo-600/20"
                style={{ justifyContent: 'center' }}
              >
                <Plus size={16} />
                New Syndicate
              </NavLink>
            </div>
          </nav>

          {/* Tour launcher & status */}
          <div className="p-4 space-y-3" style={{ borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setOnboardingOpen(true)}
              className="w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-all hover:bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
            >
              <span className="flex items-center gap-2">
                <Sparkles size={14} className="text-indigo-400" />
                <span>Platform Quickstart</span>
              </span>
              <span className="badge badge-primary text-[10px] py-0">Tour</span>
            </button>

            {/* Connection status */}
            <div className="flex items-center gap-2">
              {connected
                ? <Wifi size={13} color="#10b981" />
                : <WifiOff size={13} color="#6b6b80" />
              }
              <span className="text-xs" style={{ color: connected ? '#10b981' : 'var(--text-secondary)' }}>
                {connected ? 'Real-time sync active' : 'Connecting...'}
              </span>
            </div>

            {/* User profile card */}
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

      {/* ── Main content area ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Desktop Header bar */}
        <header
          className="hidden lg:flex items-center justify-between px-8 py-3.5 border-b"
          style={{ borderColor: 'var(--border)', background: 'rgba(17, 17, 24, 0.7)', backdropFilter: 'blur(8px)' }}
        >
          <div className="flex items-center gap-4 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800" title="All funds are calculated in integer paise without floating-point error">
              <Coins size={13} className="text-amber-400" />
              <span className="text-slate-300">Precision: <strong className="text-amber-400 font-mono">Paise</strong></span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800" title="Ownership allocation strictly sums to 10,000 basis points (100.00%)">
              <PieChart size={13} className="text-purple-400" />
              <span className="text-slate-300">Equity: <strong className="text-purple-400 font-mono">10,000 BPS</strong></span>
            </div>
            <span className="text-[11px] text-slate-500">·</span>
            <span className="text-[11px] text-amber-500/80 font-medium">⚡ Sandbox Mode (Simulated Funds)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOnboardingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/5 border border-slate-800 transition-colors"
            >
              <HelpCircle size={14} className="text-indigo-400" />
              <span>Guide & Tour</span>
            </button>

            <NavLink to="/profile" className="flex items-center gap-2 hover:opacity-90">
              <div className="avatar avatar-sm text-xs">{initials}</div>
            </NavLink>
          </div>
        </header>

        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg"
            style={{ background: 'var(--bg-card)' }}
          >
            <Menu size={18} style={{ color: 'var(--text-primary)' }} />
          </button>
          <div className="font-bold text-sm text-white">GroupBuy</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOnboardingOpen(true)}
              className="p-1.5 rounded-lg text-indigo-400 bg-indigo-500/10 border border-indigo-500/20"
              title="Tour"
            >
              <HelpCircle size={16} />
            </button>
            <NavLink to="/profile" className="avatar avatar-sm text-xs">{initials}</NavLink>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Onboarding walkthrough modal */}
      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </div>
  )
}
