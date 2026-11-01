import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import {
  Users, TrendingUp, Calendar, Package,
  AlertCircle, Plus, ArrowRight, Briefcase,
  Mail, Check
} from 'lucide-react'

function formatPaise(paise) {
  return `₹${((paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-zinc-400">{label}</span>
        <Icon size={15} className="text-zinc-500" />
      </div>
      <div className="text-xl font-bold font-mono text-white">{value}</div>
      {sub && <div className="text-[11px] text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  )
}

function GroupCard({ membership }) {
  const group = membership.group
  const progress = group.targetAmountPaise > 0
    ? Math.min(100, (group.currentAmountPaise / group.targetAmountPaise) * 100)
    : null

  const typeLabels = {
    collective_purchase: 'Collective Purchase',
    shared_equipment: 'Shared Equipment',
    business_venture: 'Business Venture',
  }

  return (
    <Link to={`/groups/${group._id}`} className="glass-card block p-4 hover:no-underline">
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="badge badge-neutral text-[10px]">
              {typeLabels[group.groupType] || group.groupType}
            </span>
            {group.title?.includes('[DEMO]') && <span className="badge badge-demo">Demo</span>}
          </div>
          <h3 className="text-sm font-semibold text-white leading-snug">
            {group.title?.replace('[DEMO] ', '')}
          </h3>
        </div>
        <span className={`badge badge-${group.status === 'active' ? 'success' : group.status === 'funding' ? 'warning' : 'neutral'} text-[10px]`}>
          {group.status}
        </span>
      </div>

      {progress !== null && (
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1 text-zinc-400">
            <span>Funding progress</span>
            <span className="font-mono text-zinc-300">{progress.toFixed(0)}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex justify-between text-[11px] mt-1 text-zinc-500 font-mono">
            <span>{formatPaise(group.currentAmountPaise)}</span>
            <span>of {formatPaise(group.targetAmountPaise)}</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-zinc-800/80 text-xs text-zinc-400">
        <div className="flex items-center gap-1">
          <Users size={12} />
          <span>{group.memberCount} members</span>
        </div>
        <span className="badge badge-neutral text-[10px]">
          {membership.role}
        </span>
        <ArrowRight size={13} className="ml-auto text-zinc-500" />
      </div>
    </Link>
  )
}

export default function Dashboard() {
  const { user, accessToken } = useAuth()
  const [myGroups, setMyGroups] = useState([])
  const [invitations, setInvitations] = useState([])
  const [myBookings, setMyBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [grpRes, invRes, bookRes] = await Promise.all([
          api.get('/groups/my', { headers: { Authorization: `Bearer ${accessToken}` } }),
          api.get('/groups/my/invitations', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => ({ data: { data: [] } })),
          api.get('/bookings/my', { headers: { Authorization: `Bearer ${accessToken}` } }).catch(() => ({ data: { data: [] } })),
        ])
        setMyGroups(grpRes.data.data || [])
        setInvitations(invRes.data.data || [])
        setMyBookings(bookRes.data.data || [])
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (accessToken) fetchData()
  }, [accessToken])

  const upcomingBookings = myBookings.filter(b => ['pending', 'approved', 'confirmed', 'active'].includes(b.status))

  const stats = [
    { icon: Users, label: 'My Groups', value: myGroups.length },
    {
      icon: TrendingUp, label: 'Total Co-funded',
      value: formatPaise(myGroups.reduce((s, m) => s + (m.group?.currentAmountPaise || 0), 0)),
      sub: 'Simulated pool balance',
    },
    { icon: Calendar, label: 'Active Bookings', value: upcomingBookings.length, sub: 'Upcoming reservations' },
    { icon: Briefcase, label: 'Ventures & Pools', value: myGroups.filter(m => ['business_venture', 'shared_equipment'].includes(m.group?.groupType)).length },
  ]

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5">
            Logged in as {user?.displayName || user?.username} ({user?.email})
          </p>
        </div>
        <Link to="/groups/new" className="btn-primary btn-sm">
          <Plus size={14} />
          Create Group
        </Link>
      </div>

      {/* Invitations banner if any */}
      {invitations.length > 0 && (
        <div className="p-3.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Mail size={16} className="text-indigo-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">
                {invitations.length} pending group {invitations.length === 1 ? 'invitation' : 'invitations'}
              </span>
              <span className="text-zinc-400 ml-1.5">You have been invited to join a collaborative group.</span>
            </div>
          </div>
          <Link to="/invitations" className="btn-primary btn-sm text-xs py-1 px-2.5 shrink-0">
            View <ArrowRight size={12} />
          </Link>
        </div>
      )}

      {/* Simulated notice */}
      <div className="sim-notice">
        <AlertCircle size={14} className="shrink-0" />
        <span>Demonstration mode: Financial ledger operations and contributions use simulated paise.</span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* My Groups */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-white">My Groups</h2>
          <Link to="/groups" className="text-xs text-indigo-400 hover:text-indigo-300">
            Browse all groups →
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-36 rounded-lg" />
            ))}
          </div>
        ) : myGroups.length === 0 ? (
          <div className="empty-state glass-card border border-zinc-800">
            <div className="empty-state-icon">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">No groups joined yet</h3>
            <p className="text-xs text-zinc-400 mb-4 max-w-xs">
              Explore open co-ownership groups or launch a new equipment pool.
            </p>
            <div className="flex gap-2.5">
              <Link to="/groups" className="btn-secondary btn-sm text-xs">Browse Groups</Link>
              <Link to="/groups/new" className="btn-primary btn-sm text-xs">Create Group</Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myGroups.map((m, i) => (
              <GroupCard key={m._id || i} membership={m} />
            ))}
          </div>
        )}
      </div>

      {/* Upcoming Equipment Bookings */}
      {upcomingBookings.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Calendar size={15} className="text-emerald-400" />
              <span>Upcoming Equipment Reservations ({upcomingBookings.length})</span>
            </h2>
            <Link to="/bookings" className="text-xs text-indigo-400 hover:text-indigo-300">
              Manage all bookings →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {upcomingBookings.slice(0, 4).map(b => (
              <div key={b._id} className="glass-card p-3.5 flex flex-col justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-semibold text-white">{b.asset?.name || 'Shared Asset'}</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">{b.group?.title?.replace('[DEMO] ', '') || 'Group Asset'}</p>
                  </div>
                  <span className={`badge badge-${b.status === 'confirmed' || b.status === 'approved' ? 'success' : 'warning'} text-[10px]`}>
                    {b.status}
                  </span>
                </div>
                <div className="mt-3 pt-2.5 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                  <span>{new Date(b.startTime).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span>→</span>
                  <span>{new Date(b.endTime).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action shortcuts */}
      <div>
        <h2 className="text-sm font-semibold text-white mb-3">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { icon: Package, title: 'Collective Purchase', desc: 'Pool funds to acquire tools or bulk supplies', to: '/groups/new' },
            { icon: Calendar, title: 'Shared Equipment', desc: 'Manage reservations on co-owned machinery', to: '/groups/new' },
            { icon: Briefcase, title: 'Business Venture', desc: 'Joint ventures with basis point equity splits', to: '/groups/new' },
          ].map((item, i) => {
            const Icon = item.icon
            return (
              <Link key={i} to={item.to} className="glass-card p-4 block hover:no-underline">
                <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center text-zinc-300 mb-2.5">
                  <Icon size={16} />
                </div>
                <h3 className="font-semibold text-xs text-white mb-0.5">{item.title}</h3>
                <p className="text-[11px] text-zinc-400">{item.desc}</p>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
