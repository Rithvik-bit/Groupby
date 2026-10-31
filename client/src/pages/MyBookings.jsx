import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Calendar, Clock, Shield, AlertCircle, CheckCircle,
  XCircle, ArrowRight, RefreshCw, X, MapPin, ExternalLink
} from 'lucide-react'
import toast from 'react-hot-toast'

const STATUS_FILTERS = [
  { id: 'all', label: 'All Bookings' },
  { id: 'pending', label: 'Pending Approval' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'active', label: 'Currently Active' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
]

export default function MyBookings() {
  const { user } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('all')
  const [cancellingId, setCancellingId] = useState(null)

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/bookings/my')
      setBookings(res.data.data || [])
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to fetch your bookings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  const handleCancelBooking = async (bookingId) => {
    const reason = window.prompt('Please enter a cancellation reason (optional):')
    if (reason === null) return

    try {
      setCancellingId(bookingId)
      await api.patch(`/bookings/${bookingId}/cancel`, { cancellationReason: reason })
      toast.success('Booking cancelled successfully and slot freed.')
      await fetchBookings()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel booking')
    } finally {
      setCancellingId(null)
    }
  }

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'all') return true
    return b.status === activeFilter
  })

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            <Calendar className="text-indigo-400" size={24} />
            My Asset Reservations
          </h1>
          <p className="text-xs text-secondary mt-1">
            Track your scheduled asset usage, approvals, active checkouts, and cancellations.
          </p>
        </div>

        <button
          onClick={fetchBookings}
          className="btn-secondary btn-sm flex items-center gap-1.5 self-start sm:self-auto"
          title="Refresh bookings"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 rounded-xl overflow-x-auto" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {STATUS_FILTERS.map((f) => {
          const count = f.id === 'all'
            ? bookings.length
            : bookings.filter((b) => b.status === f.id).length

          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className="py-2 px-3 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5"
              style={{
                background: activeFilter === f.id ? 'var(--gradient-primary)' : 'transparent',
                color: activeFilter === f.id ? 'white' : 'var(--text-secondary)',
              }}
            >
              <span>{f.label}</span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[10px]"
                style={{
                  background: activeFilter === f.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)',
                }}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Bookings List */}
      {loading ? (
        <div className="space-y-4">
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
          <div className="skeleton h-24 rounded-2xl" />
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <Calendar className="mx-auto text-indigo-400 opacity-50" size={40} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            No {activeFilter !== 'all' ? activeFilter : ''} reservations found
          </h3>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            Explore your group spaces or equipment catalogs to book tools, cameras, and facilities.
          </p>
          <Link to="/groups" className="btn-primary btn-sm inline-flex items-center gap-1 mt-2">
            Browse Groups <ArrowRight size={13} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings.map((b) => {
            const startDate = new Date(b.startTime)
            const endDate = new Date(b.endTime)
            const canCancel = ['pending', 'confirmed'].includes(b.status)

            return (
              <div
                key={b._id}
                className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                      {b.sharedAsset?.name || 'Shared Asset'}
                    </span>
                    <span className="badge text-[10px] uppercase tracking-wider" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
                      {b.sharedAsset?.category || 'Equipment'}
                    </span>
                    <span className={`badge ${
                      b.status === 'confirmed' ? 'badge-success' :
                      b.status === 'pending' ? 'badge-warning' :
                      b.status === 'active' ? 'badge-primary' :
                      b.status === 'completed' ? 'badge-neutral' :
                      'badge-danger'
                    }`}>
                      {b.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-secondary">
                    {b.group && (
                      <Link
                        to={`/groups/${b.group._id || b.group}`}
                        className="hover:underline flex items-center gap-1 text-indigo-400"
                      >
                        Group: {b.group.title || 'View Group'} <ExternalLink size={11} />
                      </Link>
                    )}

                    <div className="flex items-center gap-1.5">
                      <Clock size={12} />
                      <span>
                        {startDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        {' — '}
                        {endDate.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                    </div>

                    {b.sharedAsset?.locationDescription && (
                      <div className="flex items-center gap-1">
                        <MapPin size={12} /> {b.sharedAsset.locationDescription}
                      </div>
                    )}
                  </div>

                  {b.purpose && (
                    <p className="text-xs text-secondary italic">
                      Purpose: &quot;{b.purpose}&quot;
                    </p>
                  )}

                  {b.rejectionReason && (
                    <div className="p-2 rounded-lg bg-red-950/20 border border-red-500/20 text-xs text-red-300">
                      Rejection Reason: {b.rejectionReason}
                    </div>
                  )}

                  {b.cancellationReason && (
                    <div className="p-2 rounded-lg bg-white/5 text-xs text-secondary">
                      Cancelled Reason: {b.cancellationReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {canCancel && (
                    <button
                      onClick={() => handleCancelBooking(b._id)}
                      disabled={cancellingId === b._id}
                      className="btn-secondary btn-sm text-red-400 hover:text-red-300 hover:border-red-400/40"
                    >
                      {cancellingId === b._id ? 'Cancelling...' : 'Cancel Booking'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
