import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  Users, TrendingUp, Calendar, Package,
  AlertCircle, Plus, ArrowRight, Briefcase,
  Clock, CheckCircle, DollarSign, Mail
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatPaise(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function StatCard({ icon: Icon, label, value, sub, color = '#6366f1' }) {
  return (
    <div className="stat-card animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color}1a`, border: `1px solid ${color}30` }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
      <div className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</div>
      {sub && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)', color: '#6060a0' }}>{sub}</div>}
    </div>
  )
}

function GroupCard({ membership }) {
  const group = membership.group
  const progress = group.targetAmountPaise > 0
    ? Math.min(100, (group.currentAmountPaise / group.targetAmountPaise) * 100)
    : null

  const modeColors = {
    collective_purchase: '#6366f1',
    shared_equipment: '#10b981',
    business_venture: '#f59e0b',
  }
  const modeLabels = {
    collective_purchase: 'Collective Purchase',
    shared_equipment: 'Shared Equipment',
    business_venture: 'Business Venture',
  }

  const color = modeColors[group.groupType] || '#6366f1'

  return (
    <Link to={`/groups/${group._id}`} className="glass-card block p-4 hover:no-underline">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="badge" style={{
              background: `${color}18`, color,
              border: `1px solid ${color}30`, fontSize: '0.7rem'
            }}>
              {modeLabels[group.groupType]}
            </span>
            {group.title?.includes('[DEMO]') && <span className="badge badge-demo">DEMO</span>}
          </div>
          <h3 className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
            {group.title?.replace('[DEMO] ', '')}
          </h3>
        </div>
        <span className={`badge badge-${group.status === 'active' ? 'success' : group.status === 'funding' ? 'warning' : 'neutral'}`}
          style={{ fontSize: '0.65rem' }}>
          {group.status}
        </span>
      </div>

      {progress !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1.5">
            <span style={{ color: 'var(--text-secondary)' }}>Funding progress</span>
            <span style={{ color }}>{progress.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />
          </div>
          <div className="flex justify-between text-xs mt-1.5">
            <span style={{ color: 'var(--text-secondary)' }}>{formatPaise(group.currentAmountPaise)} raised</span>
            <span style={{ color: 'var(--text-muted)', color: '#6060a0' }}>of {formatPaise(group.targetAmountPaise)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Users size={12} />
          {group.memberCount} members
        </div>
        <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>
          {membership.role}
        </span>
        <ArrowRight size={13} className="ml-auto" style={{ color: 'var(--text-secondary)' }} />
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user, accessToken } = useAuth()
  const [myGroups, setMyGroups] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [grpRes, invRes] = await Promise.all([
          api.get('/groups/my', { headers: { Authorization: `Bearer ${accessToken}` } }),
          api.get('/groups/my/invitations', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => ({ data: { data: [] } })),
        ])
        setMyGroups(grpRes.data.data || [])
        setInvitations(invRes.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (accessToken) fetchData()
  }, [accessToken])

  const stats = [
    { icon: Users, label: 'My Groups', value: myGroups.length, color: '#6366f1' },
    {
      icon: TrendingUp, label: 'Total Contributed',
      value: formatPaise(myGroups.reduce((s, m) => s + (m.group?.currentAmountPaise || 0), 0)),
      color: '#10b981',
      sub: '(simulated)',
    },
    { icon: Briefcase, label: 'Ventures', value: myGroups.filter(m => m.group?.groupType === 'business_venture').length, color: '#f59e0b' },
    { icon: Package, label: 'Equipment Groups', value: myGroups.filter(m => m.group?.groupType === 'shared_equipment').length, color: '#3b82f6' },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.04em' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'},{' '}
            <span style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {user?.displayName?.split(' ')[0] || user?.username}
            </span>{' '}👋
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            Here's what's happening with your groups today.
          </p>
        </div>
        <Link to="/groups/new" className="btn-primary hidden sm:inline-flex">
          <Plus size={16} />
          New Group
        </Link>
      </div>

      {/* Invitations banner if any */}
      {invitations.length > 0 && (
        <div className="p-4 rounded-2xl flex items-center justify-between gap-3 animate-fade-in"
          style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-600 text-white shadow-md">
              <Mail size={16} />
            </div>
            <div>
              <div className="text-sm font-bold text-white">
                You have {invitations.length} pending group {invitations.length === 1 ? 'invitation' : 'invitations'}!
              </div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Review and respond to join collaborative buying teams.
              </div>
            </div>
          </div>
          <Link to="/invitations" className="btn-primary btn-sm shrink-0">
            View Invitations <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Simulated notice */}
      <div className="sim-notice">
        <AlertCircle size={14} />
        <span>All financial transactions on this platform are <strong>simulated</strong> for demonstration purposes. No real money is collected.</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* My Groups */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="section-title">My Groups</h2>
            <p className="section-subtitle">Groups you're a member of</p>
          </div>
          <Link to="/groups" className="btn-secondary btn-sm">
            Discover more <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => (
              <div key={i} className="skeleton h-40 rounded-2xl" />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <div className="empty-state glass-card">
            <div className="empty-state-icon">
              <Users size={24} />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No groups yet</h3>
            <p className="text-sm mb-4">Join existing groups or create your own to get started.</p>
            <div className="flex gap-3">
              <Link to="/groups" className="btn-secondary btn-sm">Browse Groups</Link>
              <Link to="/groups/new" className="btn-primary btn-sm">Create Group</Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map((m, i) => (
              <GroupCard key={m._id || i} membership={m} />
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="section-title mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: '📷', title: 'Collective Purchase', desc: 'Pool funds with others to buy shared assets', to: '/groups/new', color: '#6366f1' },
            { icon: '📽️', title: 'Share Equipment', desc: 'Manage bookings for jointly owned equipment', to: '/groups/new', color: '#10b981' },
            { icon: '🏢', title: 'Business Venture', desc: 'Launch and manage a collaborative business', to: '/groups/new', color: '#f59e0b' },
          ].map((item, i) => (
            <Link key={i} to={item.to} className="glass-card p-5 block hover:no-underline">
              <div className="text-3xl mb-3">{item.icon}</div>
              <h3 className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>{item.title}</h3>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{item.desc}</p>
              <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: item.color }}>
                Get started <ArrowRight size={12} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
