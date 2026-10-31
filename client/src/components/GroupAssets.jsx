import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Calendar, Clock, Shield, AlertTriangle, Plus,
  CheckCircle, XCircle, Info, RefreshCw,
  Wrench, ChevronRight, Archive, Check, X,
  CalendarCheck, User, MapPin, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORY_LABELS = {
  tools: '🔨 Tools',
  electronics: '💻 Electronics',
  vehicles: '🚗 Vehicles',
  spaces: '🏢 Spaces',
  appliances: '🍳 Appliances',
  sports: '⚽ Sports Equipment',
  media: '📷 Media & Cameras',
  other: '📦 Other Asset',
}

const CONDITION_COLORS = {
  new: 'badge-success',
  excellent: 'badge-success',
  good: 'badge-primary',
  fair: 'badge-warning',
  poor: 'badge-danger',
}

const STATUS_BADGES = {
  available: 'badge-success',
  in_use: 'badge-primary',
  maintenance: 'badge-warning',
  retired: 'badge-neutral',
}

export default function GroupAssets({ groupId, isLeader, isOwner }) {
  const { user } = useAuth()
  const [assets, setAssets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAsset, setSelectedAsset] = useState(null)

  // Booking & Availability state
  const [availability, setAvailability] = useState({ activeBookings: [], maintenanceBlocks: [] })
  const [availLoading, setAvailLoading] = useState(false)
  const [bookingStart, setBookingStart] = useState('')
  const [bookingEnd, setBookingEnd] = useState('')
  const [bookingPurpose, setBookingPurpose] = useState('')
  const [bookingSubmitting, setBookingSubmitting] = useState(false)

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [maintenanceForm, setMaintenanceForm] = useState({ startTime: '', endTime: '', reason: '' })

  // Leader: Group Bookings manager tab
  const [viewGroupBookings, setViewGroupBookings] = useState(false)
  const [groupBookings, setGroupBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  // Asset Form State
  const initialAssetForm = {
    name: '',
    description: '',
    category: 'tools',
    locationDescription: '',
    condition: 'good',
    usageInstructions: '',
    bookingRules: '',
    minBookingDurationHours: 1,
    maxBookingDurationHours: 48,
    advanceBookingDays: 30,
    cancellationPolicy: 'moderate',
    requiresApproval: true,
  }
  const [assetForm, setAssetForm] = useState(initialAssetForm)
  const [formSubmitting, setFormSubmitting] = useState(false)

  const fetchAssets = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get(`/groups/${groupId}/assets`)
      setAssets(res.data.data || [])
      if (res.data.data?.length > 0 && !selectedAsset) {
        setSelectedAsset(res.data.data[0])
      }
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to fetch assets')
    } finally {
      setLoading(false)
    }
  }, [groupId, selectedAsset])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // Fetch availability when selectedAsset changes
  const fetchAvailability = useCallback(async (assetId) => {
    if (!assetId) return
    try {
      setAvailLoading(true)
      const now = new Date()
      const future = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      const res = await api.get(`/groups/${groupId}/assets/${assetId}/availability`, {
        params: {
          from: now.toISOString(),
          to: future.toISOString(),
        }
      })
      setAvailability(res.data.data || { activeBookings: [], maintenanceBlocks: [] })
    } catch (err) {
      toast.error('Failed to load asset availability calendar')
    } finally {
      setAvailLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    if (selectedAsset) {
      fetchAvailability(selectedAsset._id)
    }
  }, [selectedAsset, fetchAvailability])

  const fetchGroupBookings = useCallback(async () => {
    if (!isLeader) return
    try {
      setLoadingBookings(true)
      const res = await api.get(`/groups/${groupId}/assets/bookings`)
      setGroupBookings(res.data.data || [])
    } catch (err) {
      toast.error('Failed to load group reservations')
    } finally {
      setLoadingBookings(false)
    }
  }, [groupId, isLeader])

  useEffect(() => {
    if (viewGroupBookings) {
      fetchGroupBookings()
    }
  }, [viewGroupBookings, fetchGroupBookings])

  const handleCreateAsset = async (e) => {
    e.preventDefault()
    try {
      setFormSubmitting(true)
      const res = await api.post(`/groups/${groupId}/assets`, assetForm)
      toast.success('Shared asset created successfully!')
      setShowCreateModal(false)
      setAssetForm(initialAssetForm)
      await fetchAssets()
      setSelectedAsset(res.data.data)
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to create asset')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleEditAsset = async (e) => {
    e.preventDefault()
    if (!selectedAsset) return
    try {
      setFormSubmitting(true)
      const res = await api.patch(`/groups/${groupId}/assets/${selectedAsset._id}`, assetForm)
      toast.success('Asset updated successfully!')
      setShowEditModal(false)
      setSelectedAsset(res.data.data)
      await fetchAssets()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update asset')
    } finally {
      setFormSubmitting(false)
    }
  }

  const handleArchiveAsset = async (assetId) => {
    if (!window.confirm('Are you sure you want to archive this asset? Active reservations will remain recorded, but no new bookings will be allowed.')) return
    try {
      await api.delete(`/groups/${groupId}/assets/${assetId}`)
      toast.success('Asset archived.')
      setSelectedAsset(null)
      await fetchAssets()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to archive asset')
    }
  }

  const handleBookingSubmit = async (e) => {
    e.preventDefault()
    if (!selectedAsset || !bookingStart || !bookingEnd) {
      toast.error('Please specify both start and end times')
      return
    }

    const start = new Date(bookingStart)
    const end = new Date(bookingEnd)

    if (end <= start) {
      toast.error('End time must be strictly after start time')
      return
    }

    // Client-side duration check preview
    const durationHours = (end - start) / (1000 * 60 * 60)
    if (selectedAsset.minBookingDurationHours && durationHours < selectedAsset.minBookingDurationHours) {
      toast.error(`Minimum booking duration is ${selectedAsset.minBookingDurationHours} hour(s)`)
      return
    }
    if (selectedAsset.maxBookingDurationHours && durationHours > selectedAsset.maxBookingDurationHours) {
      toast.error(`Maximum booking duration is ${selectedAsset.maxBookingDurationHours} hour(s)`)
      return
    }

    try {
      setBookingSubmitting(true)
      // Concurrency safe: Send unique idempotency key
      const idempotencyKey = `bk_${user?.id || 'anon'}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const res = await api.post(
        `/groups/${groupId}/assets/${selectedAsset._id}/bookings`,
        {
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          purpose: bookingPurpose.trim(),
        },
        {
          headers: {
            'idempotency-key': idempotencyKey,
          }
        }
      )

      toast.success(res.data.data?.status === 'confirmed' ? 'Booking confirmed!' : 'Booking requested! Awaiting approval.')
      setBookingStart('')
      setBookingEnd('')
      setBookingPurpose('')
      fetchAvailability(selectedAsset._id)
      if (viewGroupBookings) fetchGroupBookings()
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Booking request failed'
      if (err.response?.status === 409) {
        toast.error(`Slot Conflict: ${msg}`, { duration: 5000 })
      } else {
        toast.error(msg)
      }
    } finally {
      setBookingSubmitting(false)
    }
  }

  const handleAddMaintenance = async (e) => {
    e.preventDefault()
    if (!selectedAsset) return
    try {
      await api.post(`/groups/${groupId}/assets/${selectedAsset._id}/maintenance`, {
        startTime: new Date(maintenanceForm.startTime).toISOString(),
        endTime: new Date(maintenanceForm.endTime).toISOString(),
        reason: maintenanceForm.reason,
      })
      toast.success('Maintenance block scheduled')
      setShowMaintenanceModal(false)
      setMaintenanceForm({ startTime: '', endTime: '', reason: '' })
      fetchAvailability(selectedAsset._id)
      fetchAssets()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to add maintenance')
    }
  }

  const handleRemoveMaintenance = async (blockId) => {
    if (!selectedAsset) return
    try {
      await api.delete(`/groups/${groupId}/assets/${selectedAsset._id}/maintenance/${blockId}`)
      toast.success('Maintenance block removed')
      fetchAvailability(selectedAsset._id)
      fetchAssets()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove maintenance block')
    }
  }

  const handleDecision = async (bookingId, decision, rejectionReason = '') => {
    if (!selectedAsset && !groupBookings.length) return
    try {
      const assetId = selectedAsset?._id || groupBookings.find(b => b._id === bookingId)?.sharedAsset?._id
      await api.patch(`/groups/${groupId}/assets/${assetId}/bookings/${bookingId}/decision`, {
        status: decision,
        rejectionReason,
      })
      toast.success(`Booking ${decision === 'confirmed' ? 'approved' : 'rejected'}`)
      if (selectedAsset) fetchAvailability(selectedAsset._id)
      if (viewGroupBookings) fetchGroupBookings()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Action failed')
    }
  }

  const handlePickup = async (bookingId) => {
    const assetId = selectedAsset?._id || groupBookings.find(b => b._id === bookingId)?.sharedAsset?._id
    try {
      await api.post(`/groups/${groupId}/assets/${assetId}/bookings/${bookingId}/pickup`, {})
      toast.success('Pickup recorded. Asset marked in-use.')
      fetchAssets()
      if (selectedAsset) fetchAvailability(selectedAsset._id)
      if (viewGroupBookings) fetchGroupBookings()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to record pickup')
    }
  }

  const handleReturn = async (bookingId) => {
    const assetId = selectedAsset?._id || groupBookings.find(b => b._id === bookingId)?.sharedAsset?._id
    try {
      await api.post(`/groups/${groupId}/assets/${assetId}/bookings/${bookingId}/return`, {})
      toast.success('Return recorded. Slot freed.')
      fetchAssets()
      if (selectedAsset) fetchAvailability(selectedAsset._id)
      if (viewGroupBookings) fetchGroupBookings()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to record return')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in py-6">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CalendarCheck className="text-indigo-400" size={22} />
            Shared Assets & Booking
          </h2>
          <p className="text-xs text-secondary mt-1">
            Reserve group equipment and spaces with guaranteed concurrency safety [startTime, endTime).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isLeader && (
            <>
              <button
                onClick={() => setViewGroupBookings(!viewGroupBookings)}
                className={`btn-sm ${viewGroupBookings ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
              >
                <FileText size={14} />
                {viewGroupBookings ? 'Asset Catalog' : 'Manage All Bookings'}
              </button>
              <button
                onClick={() => {
                  setAssetForm(initialAssetForm)
                  setShowCreateModal(true)
                }}
                className="btn-primary btn-sm flex items-center gap-1.5"
              >
                <Plus size={14} /> Add Asset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Leader View: All Group Bookings Management */}
      {viewGroupBookings && isLeader ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              Group Reservations & Approvals ({groupBookings.length})
            </h3>
            <button onClick={fetchGroupBookings} className="btn-secondary btn-sm p-1.5" title="Refresh">
              <RefreshCw size={14} className={loadingBookings ? 'animate-spin' : ''} />
            </button>
          </div>

          {loadingBookings ? (
            <div className="skeleton h-32 rounded-xl" />
          ) : groupBookings.length === 0 ? (
            <div className="glass-card p-8 text-center text-secondary">
              No booking records found for this group.
            </div>
          ) : (
            <div className="space-y-3">
              {groupBookings.map((b) => (
                <div key={b._id} className="glass-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {b.sharedAsset?.name || 'Asset'}
                      </span>
                      <span className={`badge ${
                        b.status === 'confirmed' ? 'badge-success' :
                        b.status === 'pending' ? 'badge-warning' :
                        b.status === 'active' ? 'badge-primary' :
                        b.status === 'completed' ? 'badge-neutral' : 'badge-danger'
                      }`}>
                        {b.status}
                      </span>
                    </div>

                    <div className="text-xs text-secondary flex items-center gap-2">
                      <User size={12} /> Reserved by: <strong className="text-primary">{b.user?.displayName || b.user?.username || 'Member'}</strong>
                    </div>

                    <div className="text-xs text-secondary flex items-center gap-2">
                      <Clock size={12} />
                      {new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} — {new Date(b.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </div>

                    {b.purpose && (
                      <div className="text-xs text-secondary italic">
                        &quot;{b.purpose}&quot;
                      </div>
                    )}
                  </div>

                  {/* Leader Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    {b.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDecision(b._id, 'confirmed')}
                          className="btn-primary btn-sm flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          onClick={() => {
                            const reason = window.prompt('Enter rejection reason:')
                            if (reason !== null) handleDecision(b._id, 'rejected', reason)
                          }}
                          className="btn-danger btn-sm flex items-center gap-1"
                        >
                          <X size={13} /> Reject
                        </button>
                      </>
                    )}

                    {b.status === 'confirmed' && (
                      <button
                        onClick={() => handlePickup(b._id)}
                        className="btn-secondary btn-sm flex items-center gap-1 text-indigo-400"
                      >
                        Record Pickup
                      </button>
                    )}

                    {b.status === 'active' && (
                      <button
                        onClick={() => handleReturn(b._id)}
                        className="btn-secondary btn-sm flex items-center gap-1 text-emerald-400"
                      >
                        Record Return
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : assets.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-3">
          <CalendarCheck className="mx-auto text-indigo-400 opacity-60" size={40} />
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>No Shared Assets Registered Yet</h3>
          <p className="text-xs text-secondary max-w-sm mx-auto">
            {isLeader
              ? 'Add equipment, tools, or spaces for members to book and share collaboratively.'
              : 'The group managers have not listed any shared assets for reservation yet.'}
          </p>
          {isLeader && (
            <button
              onClick={() => {
                setAssetForm(initialAssetForm)
                setShowCreateModal(true)
              }}
              className="btn-primary btn-sm mx-auto mt-2"
            >
              <Plus size={14} /> Add First Asset
            </button>
          )}
        </div>
      ) : (
        /* Asset Selection & Calendar Grid */
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Asset List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-secondary px-1">
              Available Assets ({assets.length})
            </h3>

            <div className="space-y-2">
              {assets.map((asset) => {
                const isSelected = selectedAsset?._id === asset._id
                return (
                  <div
                    key={asset._id}
                    onClick={() => setSelectedAsset(asset)}
                    className={`p-3.5 rounded-xl cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/20'
                        : 'hover:bg-white/5'
                    }`}
                    style={{
                      border: `1px solid ${isSelected ? '#6366f1' : 'var(--border)'}`,
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                          {asset.name}
                        </div>
                        <div className="text-xs text-secondary mt-0.5">
                          {CATEGORY_LABELS[asset.category] || asset.category}
                        </div>
                      </div>
                      <span className={`badge ${STATUS_BADGES[asset.status] || 'badge-neutral'} text-[10px]`}>
                        {asset.status.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3 text-[11px] text-secondary">
                      <span className={`badge ${CONDITION_COLORS[asset.condition] || 'badge-neutral'} text-[10px]`}>
                        {asset.condition} condition
                      </span>
                      {asset.requiresApproval && (
                        <span className="badge badge-warning text-[10px]">approval req</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right Column: Selected Asset Details & Booking Form (8 cols) */}
          {selectedAsset && (
            <div className="lg:col-span-8 space-y-5">
              {/* Asset Header Details */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {selectedAsset.name}
                      </h3>
                      <span className={`badge ${STATUS_BADGES[selectedAsset.status] || 'badge-neutral'}`}>
                        {selectedAsset.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-secondary mt-1 max-w-lg leading-relaxed">
                      {selectedAsset.description}
                    </p>
                  </div>

                  {isLeader && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setAssetForm({
                            name: selectedAsset.name,
                            description: selectedAsset.description,
                            category: selectedAsset.category,
                            locationDescription: selectedAsset.locationDescription || '',
                            condition: selectedAsset.condition,
                            usageInstructions: selectedAsset.usageInstructions || '',
                            bookingRules: selectedAsset.bookingRules || '',
                            minBookingDurationHours: selectedAsset.minBookingDurationHours || 1,
                            maxBookingDurationHours: selectedAsset.maxBookingDurationHours || 48,
                            advanceBookingDays: selectedAsset.advanceBookingDays || 30,
                            cancellationPolicy: selectedAsset.cancellationPolicy || 'moderate',
                            requiresApproval: selectedAsset.requiresApproval ?? true,
                          })
                          setShowEditModal(true)
                        }}
                        className="btn-secondary btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setShowMaintenanceModal(true)}
                        className="btn-secondary btn-sm flex items-center gap-1 text-amber-400"
                      >
                        <Wrench size={13} /> Maintenance
                      </button>
                      <button
                        onClick={() => handleArchiveAsset(selectedAsset._id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"
                        title="Archive Asset"
                      >
                        <Archive size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Badges / Rules spec */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/5 text-xs">
                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-secondary block text-[10px]">Location</span>
                    <span className="font-medium flex items-center gap-1 text-primary">
                      <MapPin size={11} className="text-indigo-400" />
                      {selectedAsset.locationDescription || 'Group HQ'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-secondary block text-[10px]">Duration Limits</span>
                    <span className="font-medium text-primary">
                      {selectedAsset.minBookingDurationHours}h — {selectedAsset.maxBookingDurationHours}h
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-secondary block text-[10px]">Advance Window</span>
                    <span className="font-medium text-primary">
                      Up to {selectedAsset.advanceBookingDays} days
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/5">
                    <span className="text-secondary block text-[10px]">Cancellation</span>
                    <span className="font-medium text-primary capitalize">
                      {selectedAsset.cancellationPolicy}
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                {selectedAsset.usageInstructions && (
                  <div className="p-3 rounded-lg bg-white/5 text-xs text-secondary flex items-start gap-2">
                    <Info size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-primary block mb-0.5">Usage Instructions:</strong>
                      {selectedAsset.usageInstructions}
                    </div>
                  </div>
                )}
              </div>

              {/* Availability Calendar & Occupied Slots */}
              <div className="glass-card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Calendar size={16} className="text-indigo-400" />
                    Availability Schedule (Next 30 Days)
                  </h4>
                  <button onClick={() => fetchAvailability(selectedAsset._id)} className="btn-secondary btn-sm p-1" title="Refresh Schedule">
                    <RefreshCw size={13} className={availLoading ? 'animate-spin' : ''} />
                  </button>
                </div>

                <div className="text-[11px] text-secondary flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Free Slots
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Confirmed [start, end)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Pending Review
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Maintenance
                  </span>
                </div>

                {availLoading ? (
                  <div className="skeleton h-20 rounded-xl" />
                ) : (availability.activeBookings?.length === 0 && availability.maintenanceBlocks?.length === 0) ? (
                  <div className="p-4 rounded-xl text-center bg-white/5 text-xs text-secondary">
                    🎉 Completely open! No active reservations or maintenance scheduled for the next 30 days.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {/* Maintenance blocks */}
                    {availability.maintenanceBlocks?.map((m, idx) => (
                      <div key={idx} className="p-2.5 rounded-lg bg-red-950/20 border border-red-500/20 text-xs flex items-center justify-between">
                        <div className="flex items-center gap-2 text-red-300">
                          <Wrench size={13} />
                          <span>Maintenance: <strong>{m.reason || 'Routine service'}</strong></span>
                          <span className="opacity-75">
                            ({new Date(m.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} — {new Date(m.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })})
                          </span>
                        </div>
                        {isLeader && m._id && (
                          <button
                            onClick={() => handleRemoveMaintenance(m._id)}
                            className="text-red-400 hover:text-red-300 text-[11px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ))}

                    {/* Booked slots */}
                    {availability.activeBookings?.map((b, idx) => (
                      <div
                        key={idx}
                        className={`p-2.5 rounded-lg text-xs flex items-center justify-between ${
                          b.status === 'confirmed' ? 'bg-indigo-950/20 border border-indigo-500/20 text-indigo-300' : 'bg-amber-950/20 border border-amber-500/20 text-amber-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Clock size={13} />
                          <span>Reserved [{new Date(b.startTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} — {new Date(b.endTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })})</span>
                        </div>
                        <span className="badge text-[10px] uppercase">{b.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Concurrency-Safe Booking Form */}
              <div className="glass-card p-5 space-y-4">
                <h4 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                  <CalendarCheck size={16} className="text-emerald-400" />
                  Make a Reservation
                </h4>

                <form onSubmit={handleBookingSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Start Time *</label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={bookingStart}
                        onChange={(e) => setBookingStart(e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label className="label">End Time * (Half-Open Interval)</label>
                      <input
                        type="datetime-local"
                        className="input"
                        value={bookingEnd}
                        onChange={(e) => setBookingEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Purpose / Usage Note</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Weekend project, camera shoot for project video"
                      value={bookingPurpose}
                      onChange={(e) => setBookingPurpose(e.target.value)}
                      maxLength={500}
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-white/5 text-[11px] text-secondary flex items-start gap-2">
                    <Shield size={14} className="text-indigo-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Concurrency Guarantee:</strong> Bookings follow standard half-open intervals <code>[startTime, endTime)</code>. If your booking ends at 14:00, another member can start exactly at 14:00. Competing simultaneous requests are atomically serialized on the database server.
                    </span>
                  </div>

                  <button
                    type="submit"
                    id="submit-booking-btn"
                    className="btn-primary w-full justify-center"
                    disabled={bookingSubmitting || selectedAsset.status === 'retired'}
                  >
                    {bookingSubmitting
                      ? 'Securing Reservation...'
                      : selectedAsset.requiresApproval
                      ? 'Request Reservation (Approval Required)'
                      : 'Confirm Instant Reservation'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT ASSET MODAL ── */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                {showCreateModal ? 'Add New Shared Asset' : 'Edit Shared Asset'}
              </h3>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                }}
                className="p-1 rounded-lg text-secondary hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={showCreateModal ? handleCreateAsset : handleEditAsset} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Asset Name *</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Sony A7IV Camera Kit"
                    value={assetForm.name}
                    onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="label">Category *</label>
                  <select
                    className="select"
                    value={assetForm.category}
                    onChange={(e) => setAssetForm({ ...assetForm, category: e.target.value })}
                    required
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Description *</label>
                <textarea
                  className="input min-h-[70px]"
                  placeholder="Detailed asset condition and specifications..."
                  value={assetForm.description}
                  onChange={(e) => setAssetForm({ ...assetForm, description: e.target.value })}
                  required
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Location Description</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Locker 4, Maker Space"
                    value={assetForm.locationDescription}
                    onChange={(e) => setAssetForm({ ...assetForm, locationDescription: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Physical Condition</label>
                  <select
                    className="select"
                    value={assetForm.condition}
                    onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}
                  >
                    <option value="new">New</option>
                    <option value="excellent">Excellent</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Min Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    className="input"
                    value={assetForm.minBookingDurationHours}
                    onChange={(e) => setAssetForm({ ...assetForm, minBookingDurationHours: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="label">Max Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="720"
                    className="input"
                    value={assetForm.maxBookingDurationHours}
                    onChange={(e) => setAssetForm({ ...assetForm, maxBookingDurationHours: Number(e.target.value) })}
                  />
                </div>

                <div>
                  <label className="label">Advance Days</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="input"
                    value={assetForm.advanceBookingDays}
                    onChange={(e) => setAssetForm({ ...assetForm, advanceBookingDays: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="label">Usage Instructions</label>
                <textarea
                  className="input min-h-[50px]"
                  placeholder="Safety guidelines, startup procedure..."
                  value={assetForm.usageInstructions}
                  onChange={(e) => setAssetForm({ ...assetForm, usageInstructions: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                <input
                  type="checkbox"
                  id="requiresApprovalCheck"
                  checked={assetForm.requiresApproval}
                  onChange={(e) => setAssetForm({ ...assetForm, requiresApproval: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-0"
                />
                <label htmlFor="requiresApprovalCheck" className="text-xs cursor-pointer select-none">
                  <strong className="text-primary block">Require Manager Approval</strong>
                  <span className="text-secondary">Reservations stay pending until approved by a group leader.</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowEditModal(false)
                  }}
                  className="btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm" disabled={formSubmitting}>
                  {formSubmitting ? 'Saving...' : showCreateModal ? 'Create Asset' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MAINTENANCE MODAL ── */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <Wrench className="text-amber-400" size={18} /> Schedule Maintenance Block
              </h3>
              <button onClick={() => setShowMaintenanceModal(false)} className="text-secondary hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMaintenance} className="space-y-4">
              <div>
                <label className="label">Start Time *</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={maintenanceForm.startTime}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, startTime: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">End Time *</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={maintenanceForm.endTime}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, endTime: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Reason / Work to be done</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Lens calibration, oil change, firmware upgrade"
                  value={maintenanceForm.reason}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, reason: e.target.value })}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setShowMaintenanceModal(false)} className="btn-secondary btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn-primary btn-sm">
                  Schedule Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
