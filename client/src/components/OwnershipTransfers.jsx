import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Share2, ArrowRightLeft, ShieldCheck, CheckCircle2,
  Clock, XCircle, AlertTriangle, UserCheck, Plus,
  Coins, ArrowRight, Percent, Info, Check, X, ShieldAlert
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatPaise(paise) {
  return `₹${((paise || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

const STATUS_BADGES = {
  awaiting_buyer: { label: 'Awaiting Buyer Acceptance', color: 'badge-warning' },
  awaiting_approval: { label: 'Awaiting Admin Approval', color: 'badge-primary' },
  completed: { label: 'Completed', color: 'badge-success' },
  rejected: { label: 'Rejected', color: 'badge-danger' },
  cancelled: { label: 'Cancelled', color: 'badge-neutral' },
  proposed: { label: 'Proposed', color: 'badge-warning' },
}

export default function OwnershipTransfers({ groupId, isLeader, members = [] }) {
  const { user } = useAuth()
  const [ownershipData, setOwnershipData] = useState({ records: [], totalAllocatedBasisPoints: 0, myBasisPoints: 0, provisional: false })
  const [transfers, setTransfers] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoadingId, setActionLoadingId] = useState(null)

  // Propose Modal state
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    toUserId: '',
    basisPoints: '',
    percentage: '',
    priceRupees: '0',
    note: '',
  })

  // Initialize Modal state (Leader)
  const [showInitModal, setShowInitModal] = useState(false)
  const [initializing, setInitializing] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [ownRes, transRes] = await Promise.all([
        api.get(`/groups/${groupId}/transfers/ownership`),
        api.get(`/groups/${groupId}/transfers`),
      ])
      setOwnershipData(ownRes.data.data)
      setTransfers(transRes.data.data || [])
    } catch {
      toast.error('Failed to load ownership records.')
    } finally {
      setLoading(false)
    }
  }, [groupId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Synchronize percentage and basis points in modal
  const handleBpsChange = (bpsVal) => {
    const bps = parseInt(bpsVal, 10) || ''
    setForm(prev => ({
      ...prev,
      basisPoints: bps,
      percentage: bps ? (bps / 100).toFixed(2) : '',
    }))
  }

  const handlePctChange = (pctVal) => {
    const pct = parseFloat(pctVal) || ''
    setForm(prev => ({
      ...prev,
      percentage: pctVal,
      basisPoints: pct ? Math.round(pct * 100) : '',
    }))
  }

  const handlePropose = async (e) => {
    e.preventDefault()
    if (!form.toUserId) {
      toast.error('Please select a recipient member.')
      return
    }
    const bps = parseInt(form.basisPoints, 10)
    if (!bps || bps < 1 || bps > 10000) {
      toast.error('Basis points must be between 1 and 10,000.')
      return
    }
    const priceRupees = parseFloat(form.priceRupees) || 0
    if (priceRupees < 0) {
      toast.error('Transfer price cannot be negative.')
      return
    }

    try {
      setSubmitting(true)
      await api.post(`/groups/${groupId}/transfers`, {
        toUserId: form.toUserId,
        basisPoints: bps,
        proposedPricePaise: Math.round(priceRupees * 100),
        note: form.note.trim(),
      })
      toast.success('Ownership transfer proposed!')
      setShowModal(false)
      setForm({ toUserId: '', basisPoints: '', percentage: '', priceRupees: '0', note: '' })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to propose transfer.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async (transferId) => {
    try {
      setActionLoadingId(transferId)
      await api.patch(`/groups/${groupId}/transfers/${transferId}/accept`, {})
      toast.success('Transfer proposal accepted! Awaiting administrator sign-off.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to accept transfer.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleApprove = async (transferId) => {
    try {
      setActionLoadingId(transferId)
      await api.patch(`/groups/${groupId}/transfers/${transferId}/approve`, {
        note: 'Approved by administrator',
      })
      toast.success('Ownership transfer finalized and equity records rebalanced!')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to approve transfer.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleReject = async (transferId) => {
    try {
      setActionLoadingId(transferId)
      await api.patch(`/groups/${groupId}/transfers/${transferId}/reject`, {
        note: 'Declined by recipient or administrator',
      })
      toast.success('Transfer proposal declined.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to decline transfer.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleCancel = async (transferId) => {
    try {
      setActionLoadingId(transferId)
      await api.patch(`/groups/${groupId}/transfers/${transferId}/cancel`, {})
      toast.success('Transfer proposal cancelled.')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel transfer.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleInitializeFromLedger = async () => {
    try {
      setInitializing(true)
      await api.post(`/groups/${groupId}/transfers/ownership/initialize`, {})
      toast.success('Ownership equity shares initialized from contribution ledger!')
      setShowInitModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to initialize ownership.')
    } finally {
      setInitializing(false)
    }
  }

  // Active proposals where current user is buyer
  const awaitingMyAcceptance = transfers.filter(
    t => t.status === 'awaiting_buyer' && (t.toUser?._id || t.toUser) === user?.id
  )

  // Active proposals needing admin sign-off
  const awaitingAdminApproval = isLeader
    ? transfers.filter(t => t.status === 'awaiting_approval')
    : []

  const eligibleBuyers = members.filter(
    m => (m.user?._id || m.user?.id || m.user) !== user?.id && m.status === 'active'
  )

  const mySharePct = (ownershipData.myBasisPoints / 100).toFixed(2)

  return (
    <div className="space-y-6">
      {/* ── Summary & Actions Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <span>My Equity Share</span>
            <Percent className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">{mySharePct}%</span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
              ({ownershipData.myBasisPoints.toLocaleString()} bps)
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {ownershipData.provisional ? 'Provisional share from contribution' : 'Verified finalized equity'}
          </p>
        </div>

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <span>Total Equity Allocated</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400">
              {(ownershipData.totalAllocatedBasisPoints / 100).toFixed(1)}%
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>
              ({ownershipData.totalAllocatedBasisPoints.toLocaleString()} / 10,000 bps)
            </span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {ownershipData.totalAllocatedBasisPoints === 10000 ? '100% fully allocated' : 'Open equity remaining'}
          </p>
        </div>

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <span>Active Transfers</span>
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-400">
              {transfers.filter(t => ['awaiting_buyer', 'awaiting_approval'].includes(t.status)).length}
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-secondary)' }}>pending proposals</span>
          </div>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Requires 2-party handshake + admin sign-off
          </p>
        </div>

        <div className="p-4 rounded-xl border flex flex-col justify-between" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            <span>Transfer Share</span>
            <Share2 className="w-4 h-4 text-indigo-400" />
          </div>
          <button
            onClick={() => setShowModal(true)}
            disabled={ownershipData.myBasisPoints <= 0}
            className="btn btn-primary mt-3 flex items-center justify-center gap-2 py-2 px-3 text-sm font-semibold rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Propose Transfer</span>
          </button>
          {ownershipData.myBasisPoints <= 0 && (
            <p className="text-[11px] mt-1 text-center" style={{ color: 'var(--text-muted)' }}>
              You need an active share to transfer
            </p>
          )}
        </div>
      </div>

      {/* ── Action Banners: Awaiting Buyer Acceptance ─────────────────────── */}
      {awaitingMyAcceptance.length > 0 && (
        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>You have {awaitingMyAcceptance.length} pending equity transfer proposal(s)!</span>
          </div>
          {awaitingMyAcceptance.map(t => (
            <div key={t._id} className="p-3 rounded-lg bg-black/40 border border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">
                  <span className="font-semibold text-amber-300">{t.fromUser?.displayName || 'A member'}</span> wants to transfer{' '}
                  <span className="font-bold text-white">{(t.basisPointsToTransfer / 100).toFixed(2)}%</span> ({t.basisPointsToTransfer} bps) to you.
                </p>
                <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>Agreed Price: <strong className="text-white">{t.proposedPricePaise > 0 ? formatPaise(t.proposedPricePaise) : 'Free (Gift/Internal)'}</strong></span>
                  {t.auditNote && <span>Note: &ldquo;{t.auditNote}&rdquo;</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAccept(t._id)}
                  disabled={actionLoadingId === t._id}
                  className="btn btn-success py-1.5 px-3 text-xs flex items-center gap-1.5 rounded-lg"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Accept Offer</span>
                </button>
                <button
                  onClick={() => handleReject(t._id)}
                  disabled={actionLoadingId === t._id}
                  className="btn btn-danger py-1.5 px-3 text-xs flex items-center gap-1.5 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Decline</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Action Banners: Admin Approval Queue ───────────────────────────── */}
      {awaitingAdminApproval.length > 0 && (
        <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-500/10 space-y-3">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
            <ShieldAlert className="w-4 h-4" />
            <span>Administrator Action Required: {awaitingAdminApproval.length} transfer(s) await sign-off</span>
          </div>
          {awaitingAdminApproval.map(t => (
            <div key={t._id} className="p-3 rounded-lg bg-black/40 border border-indigo-500/20 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">
                  <span className="text-indigo-300 font-semibold">{t.fromUser?.displayName}</span> →{' '}
                  <span className="text-indigo-300 font-semibold">{t.toUser?.displayName}</span>:{' '}
                  <span className="font-bold text-white">{(t.basisPointsToTransfer / 100).toFixed(2)}%</span> ({t.basisPointsToTransfer} bps)
                </p>
                <div className="flex items-center gap-4 text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  <span>Transfer Price: <strong className="text-white">{t.proposedPricePaise > 0 ? formatPaise(t.proposedPricePaise) : 'Free'}</strong></span>
                  {t.auditNote && <span>Details: &ldquo;{t.auditNote}&rdquo;</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleApprove(t._id)}
                  disabled={actionLoadingId === t._id}
                  className="btn btn-primary py-1.5 px-3 text-xs flex items-center gap-1.5 rounded-lg"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Approve & Finalize Equity</span>
                </button>
                <button
                  onClick={() => handleReject(t._id)}
                  disabled={actionLoadingId === t._id}
                  className="btn btn-danger py-1.5 px-3 text-xs flex items-center gap-1.5 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Reject</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Equity Distribution Breakdown ─────────────────────────────────── */}
      <div className="p-5 rounded-xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-semibold text-white text-base flex items-center gap-2">
              <Coins className="w-5 h-5 text-indigo-400" />
              <span>Co-ownership Equity Ledger</span>
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              10,000 basis points represents 100% fractional ownership of the group&apos;s physical resources.
            </p>
          </div>
          {isLeader && (
            <button
              onClick={() => setShowInitModal(true)}
              className="btn btn-secondary py-1.5 px-3 text-xs flex items-center gap-1.5 rounded-lg"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Initialize / Sync from Contributions</span>
            </button>
          )}
        </div>

        {/* Visual Equity Bar */}
        {ownershipData.records.length > 0 && (
          <div className="space-y-1.5">
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-neutral-800">
              {ownershipData.records.map((r, idx) => {
                const colors = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6']
                const bg = colors[idx % colors.length]
                const widthPct = (r.ownershipBasisPoints / 10000) * 100
                return (
                  <div
                    key={r._id || idx}
                    style={{ width: `${widthPct}%`, background: bg }}
                    title={`${r.user?.displayName || 'Member'}: ${(r.ownershipBasisPoints / 100).toFixed(2)}%`}
                    className="h-full transition-all duration-300"
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* Ownership Records Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="py-2.5 px-3 font-medium text-xs">Member</th>
                <th className="py-2.5 px-3 font-medium text-xs">Equity Share</th>
                <th className="py-2.5 px-3 font-medium text-xs">Basis Points</th>
                <th className="py-2.5 px-3 font-medium text-xs">Contributed</th>
                <th className="py-2.5 px-3 font-medium text-xs">Status</th>
                <th className="py-2.5 px-3 font-medium text-xs text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {ownershipData.records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No ownership records established yet. Contributors will automatically receive provisional shares.
                  </td>
                </tr>
              ) : (
                ownershipData.records.map((r) => {
                  const isMe = (r.user?._id || r.user) === user?.id
                  return (
                    <tr key={r._id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                            {r.user?.displayName?.[0] || 'U'}
                          </div>
                          <div>
                            <span className="font-medium text-white">{r.user?.displayName || 'Anonymous Member'}</span>
                            {isMe && <span className="ml-2 badge badge-primary text-[10px] py-0 px-1.5">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {(r.ownershipBasisPoints / 100).toFixed(2)}%
                      </td>
                      <td className="py-3 px-3 font-mono text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {r.ownershipBasisPoints.toLocaleString()} bps
                      </td>
                      <td className="py-3 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {r.contributionAmountPaise ? formatPaise(r.contributionAmountPaise) : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`badge ${r.status === 'finalized' ? 'badge-success' : 'badge-neutral'} text-[11px]`}>
                          {r.status || 'provisional'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!isMe && ownershipData.myBasisPoints > 0 && (
                          <button
                            onClick={() => {
                              setForm(prev => ({ ...prev, toUserId: r.user?._id || r.user }))
                              setShowModal(true)
                            }}
                            className="btn btn-secondary py-1 px-2.5 text-xs rounded-md"
                          >
                            Transfer Share
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Transfer Proposal & History Ledger ────────────────────────────── */}
      <div className="p-5 rounded-xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
        <h3 className="font-semibold text-white text-base flex items-center gap-2">
          <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
          <span>Transfer Proposals &amp; Audit Trail</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <th className="py-2.5 px-3 font-medium text-xs">Date</th>
                <th className="py-2.5 px-3 font-medium text-xs">Seller</th>
                <th className="py-2.5 px-3 font-medium text-xs">Buyer</th>
                <th className="py-2.5 px-3 font-medium text-xs">Share (bps)</th>
                <th className="py-2.5 px-3 font-medium text-xs">Price</th>
                <th className="py-2.5 px-3 font-medium text-xs">Status</th>
                <th className="py-2.5 px-3 font-medium text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
                    No ownership transfer proposals recorded for this group yet.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => {
                  const badge = STATUS_BADGES[t.status] || { label: t.status, color: 'badge-neutral' }
                  const isSeller = (t.fromUser?._id || t.fromUser) === user?.id
                  const isBuyer = (t.toUser?._id || t.toUser) === user?.id

                  return (
                    <tr key={t._id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-white">{t.fromUser?.displayName || 'Seller'}</span>
                        {isSeller && <span className="ml-1.5 badge badge-primary text-[10px] py-0 px-1">You</span>}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-medium text-white">{t.toUser?.displayName || 'Buyer'}</span>
                        {isBuyer && <span className="ml-1.5 badge badge-primary text-[10px] py-0 px-1">You</span>}
                      </td>
                      <td className="py-3 px-3 font-semibold text-white">
                        {(t.basisPointsToTransfer / 100).toFixed(2)}%
                        <span className="text-xs ml-1 font-mono font-normal" style={{ color: 'var(--text-muted)' }}>
                          ({t.basisPointsToTransfer} bps)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs font-medium text-white">
                        {t.proposedPricePaise > 0 ? formatPaise(t.proposedPricePaise) : 'Free'}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`badge ${badge.color} text-[11px]`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {/* Buyer actions */}
                        {isBuyer && t.status === 'awaiting_buyer' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAccept(t._id)}
                              disabled={actionLoadingId === t._id}
                              className="btn btn-success py-1 px-2 text-xs rounded"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleReject(t._id)}
                              disabled={actionLoadingId === t._id}
                              className="btn btn-danger py-1 px-2 text-xs rounded"
                            >
                              Decline
                            </button>
                          </div>
                        )}

                        {/* Leader approval actions */}
                        {isLeader && t.status === 'awaiting_approval' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleApprove(t._id)}
                              disabled={actionLoadingId === t._id}
                              className="btn btn-primary py-1 px-2 text-xs rounded"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(t._id)}
                              disabled={actionLoadingId === t._id}
                              className="btn btn-danger py-1 px-2 text-xs rounded"
                            >
                              Reject
                            </button>
                          </div>
                        )}

                        {/* Seller cancellation action */}
                        {isSeller && ['proposed', 'awaiting_buyer', 'awaiting_approval'].includes(t.status) && (
                          <button
                            onClick={() => handleCancel(t._id)}
                            disabled={actionLoadingId === t._id}
                            className="btn btn-secondary py-1 px-2 text-xs rounded text-rose-400 hover:text-rose-300"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Propose Equity Transfer ─────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-5 animate-scale-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-lg">Propose Share Transfer</h3>
              </div>
              <button onClick={() => setShowModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              Transfer a portion of your ownership share to another group member. The buyer will accept, followed by group administrator sign-off.
            </p>

            <form onSubmit={handlePropose} className="space-y-4">
              {/* Buyer Selector */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Recipient Member *
                </label>
                <select
                  required
                  value={form.toUserId}
                  onChange={(e) => setForm(prev => ({ ...prev, toUserId: e.target.value }))}
                  className="w-full py-2 px-3 rounded-lg text-sm bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">Select active member...</option>
                  {eligibleBuyers.map(m => (
                    <option key={m.user?._id || m.user} value={m.user?._id || m.user}>
                      {m.user?.displayName || m.user?.username || 'Member'} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Share Percentage & Basis Points */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Share Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={(ownershipData.myBasisPoints / 100).toFixed(2)}
                    placeholder="e.g. 15.00"
                    value={form.percentage}
                    onChange={(e) => handlePctChange(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg text-sm bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    Basis Points (bps) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={ownershipData.myBasisPoints}
                    required
                    placeholder="e.g. 1500"
                    value={form.basisPoints}
                    onChange={(e) => handleBpsChange(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg text-sm bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Proposed Price */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Proposed Price (₹ INR, Simulated)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-neutral-400 font-semibold text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.priceRupees}
                    onChange={(e) => setForm(prev => ({ ...prev, priceRupees: e.target.value }))}
                    className="w-full py-2 pl-8 pr-3 rounded-lg text-sm bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <span className="text-[11px] mt-1 block" style={{ color: 'var(--text-muted)' }}>
                  Set to 0 if transferring free of cost or settled externally.
                </span>
              </div>

              {/* Transfer Note */}
              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Note / Reason for Transfer
                </label>
                <textarea
                  rows={2}
                  maxLength={300}
                  placeholder="e.g., Transferring 10% share for studio shoot expenses..."
                  value={form.note}
                  onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
                  className="w-full py-2 px-3 rounded-lg text-sm bg-neutral-900 border border-neutral-700 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Disclaimer */}
              <div className="p-3 rounded-lg bg-neutral-900/60 border border-neutral-800 text-[11px] text-neutral-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Simulated Co-Ownership:</strong> This record formalizes fractional usage rights and bookable privileges within GroupBuy.
                </span>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-secondary py-2 px-4 text-sm rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary py-2 px-4 text-sm font-semibold rounded-lg flex items-center gap-2"
                >
                  {submitting ? 'Submitting...' : 'Send Transfer Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Initialize from Contribution Ledger ────────────────────── */}
      {showInitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border p-6 space-y-4 animate-scale-in" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">Initialize Equity Ledger</h3>
              <button onClick={() => setShowInitModal(false)} className="text-neutral-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              This administrator action reads all verified simulated contributions for this group, computes each member&apos;s exact mathematical percentage, and finalizes official 10,000 basis points records.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowInitModal(false)}
                className="btn btn-secondary py-2 px-4 text-sm rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInitializeFromLedger}
                disabled={initializing}
                className="btn btn-primary py-2 px-4 text-sm font-semibold rounded-lg"
              >
                {initializing ? 'Calculating & Saving...' : 'Confirm Initialization'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
