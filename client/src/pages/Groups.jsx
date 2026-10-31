import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Search, Filter, Users, TrendingUp, MapPin, ArrowRight, RefreshCw, CheckCircle, Sparkles } from 'lucide-react'

const CATEGORIES = ['electronics', 'photography', 'printing', 'agriculture', 'workshop', 'vehicles', 'real_estate', 'services', 'other']
const GROUP_TYPES = ['collective_purchase', 'shared_equipment', 'business_venture']
const TYPE_LABELS = {
  collective_purchase: 'Collective Purchase',
  shared_equipment: 'Shared Equipment',
  business_venture: 'Business Venture',
}
const TYPE_COLORS = {
  collective_purchase: '#6366f1',
  shared_equipment: '#10b981',
  business_venture: '#f59e0b',
}

function formatPaise(p) {
  return `₹${(p / 100).toLocaleString('en-IN')}`
}

function GroupCard({ group }) {
  const color = TYPE_COLORS[group.groupType] || '#6366f1'
  const progress = group.targetAmountPaise > 0
    ? Math.min(100, (group.currentAmountPaise / group.targetAmountPaise) * 100)
    : null

  const isFull = group.memberCount >= group.maxMembers

  return (
    <Link to={`/groups/${group._id}`} className="glass-card block p-5 hover:no-underline transition-all hover:scale-[1.01]">
      <div className="flex items-start justify-between mb-3">
        <span className="badge" style={{ background: `${color}18`, color, border: `1px solid ${color}30`, fontSize: '0.7rem' }}>
          {TYPE_LABELS[group.groupType]}
        </span>
        <div className="flex items-center gap-1.5">
          {isFull && (
            <span className="badge badge-neutral" style={{ fontSize: '0.65rem', background: 'rgba(239,68,68,0.1)', color: '#f87171' }}>
              Full
            </span>
          )}
          <span className={`badge badge-${group.status === 'active' ? 'success' : group.status === 'funding' ? 'warning' : 'neutral'}`}
            style={{ fontSize: '0.65rem' }}>
            {group.status}
          </span>
        </div>
      </div>

      <h3 className="text-sm font-bold leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>
        {group.title?.replace('[DEMO] ', '')}
        {group.title?.includes('[DEMO]') && (
          <span className="badge badge-demo ml-2" style={{ fontSize: '0.6rem', verticalAlign: 'middle' }}>DEMO</span>
        )}
      </h3>

      <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
        {group.description?.replace('[SAMPLE DATA]', '').trim()}
      </p>

      {progress !== null && (
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span style={{ color: 'var(--text-secondary)' }}>{progress.toFixed(0)}% funded</span>
            <span style={{ color }}>{formatPaise(group.currentAmountPaise)}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
          <Users size={12} />
          {group.memberCount}/{group.maxMembers}
        </div>
        {group.city && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <MapPin size={12} />
            {group.city}
          </div>
        )}
        {group.targetAmountPaise > 0 && (
          <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <TrendingUp size={12} />
            {formatPaise(group.targetAmountPaise)}
          </div>
        )}
        <ArrowRight size={13} className="ml-auto" style={{ color: 'var(--text-secondary)' }} />
      </div>
    </Link>
  )
}

export default function Groups() {
  const { user, accessToken } = useAuth()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    groupType: '',
    status: '',
    hasCapacity: false,
    matchInterests: false,
    minTargetRupees: '',
    maxTargetRupees: '',
  })
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 })

  const fetchGroups = async (page = 1) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page, limit: 12 })
      if (filters.search) params.set('search', filters.search)
      if (filters.category) params.set('category', filters.category)
      if (filters.groupType) params.set('groupType', filters.groupType)
      if (filters.status) params.set('status', filters.status)
      if (filters.hasCapacity) params.set('hasCapacity', 'true')
      if (filters.matchInterests) params.set('matchInterests', 'true')
      if (filters.minTargetRupees) params.set('minTargetPaise', Math.round(Number(filters.minTargetRupees) * 100))
      if (filters.maxTargetRupees) params.set('maxTargetPaise', Math.round(Number(filters.maxTargetRupees) * 100))

      const res = await api.get(`/groups?${params}`)
      setGroups(res.data.data)
      setPagination(res.data.pagination)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups(1)
  }, [filters])

  const handleReset = () => {
    setFilters({
      search: '',
      category: '',
      groupType: '',
      status: '',
      hasCapacity: false,
      matchInterests: false,
      minTargetRupees: '',
      maxTargetRupees: '',
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Discover Groups
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Find collaborative purchases, shared equipment, and joint ventures
          </p>
        </div>
        <Link to="/groups/new" className="btn-primary">
          <span>+</span> New Group
        </Link>
      </div>

      {/* Search & filters card */}
      <div className="glass-card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              id="group-search"
              className="input pl-9"
              placeholder="Search groups by title, description or tags..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <select id="filter-type" className="select sm:w-48"
            value={filters.groupType} onChange={(e) => setFilters({ ...filters, groupType: e.target.value })}>
            <option value="">All Types</option>
            {GROUP_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <select id="filter-category" className="select sm:w-44"
            value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">All Categories</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select id="filter-status" className="select sm:w-36"
            value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="funding">Funding</option>
            <option value="active">Active</option>
          </select>
        </div>

        {/* Second row: Budget range and toggles */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--text-secondary)' }}>Budget (₹):</span>
            <input
              type="number"
              placeholder="Min ₹"
              className="input text-xs py-1 px-2 w-24"
              value={filters.minTargetRupees}
              onChange={(e) => setFilters({ ...filters, minTargetRupees: e.target.value })}
            />
            <span style={{ color: 'var(--text-secondary)' }}>to</span>
            <input
              type="number"
              placeholder="Max ₹"
              className="input text-xs py-1 px-2 w-24"
              value={filters.maxTargetRupees}
              onChange={(e) => setFilters({ ...filters, maxTargetRupees: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
              <input
                type="checkbox"
                checked={filters.hasCapacity}
                onChange={(e) => setFilters({ ...filters, hasCapacity: e.target.checked })}
                className="accent-indigo-500 rounded"
              />
              Has Capacity Only
            </label>

            {user && (
              <label className="flex items-center gap-1.5 cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={filters.matchInterests}
                  onChange={(e) => setFilters({ ...filters, matchInterests: e.target.checked })}
                  className="accent-indigo-500 rounded"
                />
                <Sparkles size={12} color="#818cf8" />
                Match My Interests
              </label>
            )}

            <button className="btn-secondary btn-sm" onClick={handleReset}>
              <RefreshCw size={13} /> Reset
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      <div>
        <p className="text-xs mb-4" style={{ color: 'var(--text-secondary)' }}>
          {pagination.total} {pagination.total === 1 ? 'group' : 'groups'} found
        </p>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton h-52 rounded-2xl" />)}
          </div>
        ) : groups.length === 0 ? (
          <div className="empty-state glass-card p-8 text-center">
            <div className="empty-state-icon mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
              <Users size={24} color="#818cf8" />
            </div>
            <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No groups found</h3>
            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Try adjusting your filters or create a new group.</p>
            <Link to="/groups/new" className="btn-primary btn-sm inline-flex">Create a Group</Link>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map(g => <GroupCard key={g._id} group={g} />)}
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-6">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchGroups(pagination.page - 1)}
                  className="btn-secondary btn-sm"
                >
                  Previous
                </button>
                <span className="text-xs px-2" style={{ color: 'var(--text-secondary)' }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => fetchGroups(pagination.page + 1)}
                  className="btn-secondary btn-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
