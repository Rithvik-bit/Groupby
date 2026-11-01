import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  TrendingUp, TrendingDown, DollarSign, Plus,
  CheckCircle, XCircle, Clock, AlertTriangle,
  FileText, Trash2, Filter, Receipt, ShieldAlert,
  Coins, ArrowDownRight, ArrowUpRight, Check, X
} from 'lucide-react'
import toast from 'react-hot-toast'

function formatPaise(paise) {
  return `₹${((paise || 0) / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

const CATEGORY_TAGS = {
  maintenance: { label: 'Maintenance', color: 'badge-warning' },
  repairs: { label: 'Repairs', color: 'badge-danger' },
  supplies: { label: 'Supplies', color: 'badge-primary' },
  equipment: { label: 'Equipment', color: 'badge-primary' },
  subscription: { label: 'Subscription', color: 'badge-neutral' },
  insurance: { label: 'Insurance', color: 'badge-neutral' },
  revenue: { label: 'Revenue', color: 'badge-success' },
  general: { label: 'General', color: 'badge-neutral' },
}

export default function GroupFinancials({ groupId, isLeader, isOwner }) {
  const { user } = useAuth()
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modal State
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    entryType: 'expense',
    amountRupees: '',
    category: 'maintenance',
    description: '',
    documentReference: '',
    entryDate: new Date().toISOString().split('T')[0],
  })

  // Approval action state
  const [actionLoadingId, setActionLoadingId] = useState(null)

  const fetchFinancials = useCallback(async () => {
    try {
      setLoading(true)
      const params = {}
      if (typeFilter) params.entryType = typeFilter
      if (statusFilter) params.approvalStatus = statusFilter

      const res = await api.get(`/groups/${groupId}/financials`, { params })
      setEntries(res.data.data.entries || [])
      setSummary(res.data.data.summary || null)
    } catch {
      toast.error('Failed to load group financial ledger.')
    } finally {
      setLoading(false)
    }
  }, [groupId, typeFilter, statusFilter])

  useEffect(() => {
    fetchFinancials()
  }, [fetchFinancials])

  const handleCreateEntry = async (e) => {
    e.preventDefault()
    const rupees = parseFloat(form.amountRupees)
    if (isNaN(rupees) || rupees <= 0) {
      return toast.error('Please enter a valid amount greater than ₹0.')
    }
    if (!form.description.trim()) {
      return toast.error('Please provide a description for this entry.')
    }

    const amountPaise = Math.round(rupees * 100)
    setSubmitting(true)
    try {
      const res = await api.post(`/groups/${groupId}/financials`, {
        entryType: form.entryType,
        amountPaise,
        description: form.description.trim(),
        category: form.category,
        documentReference: form.documentReference.trim(),
        entryDate: form.entryDate ? new Date(form.entryDate).toISOString() : undefined,
      })

      if (res.data.data.approvalStatus === 'pending') {
        toast.success(`Expense of ₹${rupees.toLocaleString('en-IN')} submitted for leader approval.`)
      } else {
        toast.success(`Recorded ₹${rupees.toLocaleString('en-IN')} ${form.entryType} in ledger.`)
      }

      setShowModal(false)
      setForm({
        entryType: 'expense',
        amountRupees: '',
        category: 'maintenance',
        description: '',
        documentReference: '',
        entryDate: new Date().toISOString().split('T')[0],
      })
      fetchFinancials()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to record entry.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDecision = async (entryId, decision) => {
    setActionLoadingId(entryId)
    try {
      await api.patch(`/groups/${groupId}/financials/${entryId}/approve`, {
        decision,
        note: decision === 'approved' ? 'Approved by group leader' : 'Declined by leader',
      })
      toast.success(`Expense ${decision === 'approved' ? 'approved' : 'rejected'}.`)
      fetchFinancials()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || `Failed to ${decision} expense.`)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleDelete = async (entryId) => {
    if (!window.confirm('Are you sure you want to delete this ledger entry?')) return
    setActionLoadingId(entryId)
    try {
      await api.delete(`/groups/${groupId}/financials/${entryId}`)
      toast.success('Entry removed.')
      fetchFinancials()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete entry.')
    } finally {
      setActionLoadingId(null)
    }
  }

  const thresholdRupees = ((summary?.approvalThresholdPaise || 100000) / 100).toLocaleString('en-IN')

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Cash Balance */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-400">Net Balance</span>
            <Coins size={15} className="text-indigo-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${(summary?.netBalancePaise || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatPaise(summary?.netBalancePaise || 0)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Inflows minus expenses</div>
        </div>

        {/* Total Expenses */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-400">Total Expenses</span>
            <TrendingDown size={15} className="text-rose-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {formatPaise(summary?.totalExpensesPaise || 0)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Approved & regular costs</div>
        </div>

        {/* Total Revenue */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-400">Total Revenue</span>
            <TrendingUp size={15} className="text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white">
            {formatPaise(summary?.totalRevenuesPaise || 0)}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">External rentals & earnings</div>
        </div>

        {/* Pending Approvals */}
        <div className="stat-card">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-zinc-400">Pending Approvals</span>
            <Clock size={15} className="text-amber-400" />
          </div>
          <div className={`text-xl font-bold font-mono ${summary?.pendingApprovalCount > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>
            {summary?.pendingApprovalCount || 0}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            {summary?.pendingApprovalCount > 0
              ? `${formatPaise(summary?.pendingApprovalAmountPaise || 0)} awaiting sign-off`
              : 'All expenses cleared'}
          </div>
        </div>
      </div>

      {/* ── Pending Approvals Banner for Leaders ────────────────────────── */}
      {isLeader && summary?.pendingApprovalCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert size={18} className="text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-white">
                {summary.pendingApprovalCount} expense{summary.pendingApprovalCount > 1 ? 's' : ''} require leader sign-off
              </span>
              <p className="text-zinc-400 mt-0.5">
                Expenses of ₹{thresholdRupees} or higher require authorization before deducting from the co-op balance.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter(statusFilter === 'pending' ? '' : 'pending')}
            className="btn-secondary btn-sm whitespace-nowrap text-xs text-amber-300 border-amber-500/40 hover:bg-amber-500/10"
          >
            {statusFilter === 'pending' ? 'View all entries' : 'Filter pending review'}
          </button>
        </div>
      )}

      {/* ── Controls Bar: Filters & Action Buttons ──────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input text-xs py-1.5 px-3 rounded-lg bg-zinc-900 border-zinc-800 text-zinc-300"
          >
            <option value="">All Types</option>
            <option value="expense">Expenses only</option>
            <option value="revenue">Revenues only</option>
            <option value="refund">Refunds</option>
            <option value="distribution">Distributions</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input text-xs py-1.5 px-3 rounded-lg bg-zinc-900 border-zinc-800 text-zinc-300"
          >
            <option value="">All Statuses</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending Approval</option>
            <option value="not_required">Standard (No approval needed)</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              setForm(prev => ({ ...prev, entryType: 'expense', category: 'maintenance' }))
              setShowModal(true)
            }}
            className="btn-primary btn-sm text-xs flex items-center gap-1.5 shadow-sm shadow-indigo-600/30"
          >
            <Plus size={14} /> Record Expense
          </button>
          <button
            onClick={() => {
              setForm(prev => ({ ...prev, entryType: 'revenue', category: 'revenue' }))
              setShowModal(true)
            }}
            className="btn-secondary btn-sm text-xs flex items-center gap-1.5 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
          >
            <ArrowUpRight size={14} /> Record Revenue
          </button>
        </div>
      </div>

      {/* ── Ledger Stream / Table ───────────────────────────────────────── */}
      <div className="border rounded-xl bg-zinc-950 border-zinc-800/80 overflow-hidden shadow-lg">
        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading financial ledger...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-zinc-400 text-xs space-y-2">
            <Receipt size={28} className="mx-auto text-zinc-600 mb-1" />
            <p className="font-semibold text-zinc-300">No financial records found</p>
            <p className="text-zinc-500 max-w-sm mx-auto">
              Record co-op expenses, maintenance repairs, or rental income to keep a transparent audit trail.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-zinc-400 bg-zinc-900/70 border-zinc-800">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Type & Category</th>
                  <th className="py-3 px-4 font-medium">Description & Ref</th>
                  <th className="py-3 px-4 font-medium">Recorded By</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                  <th className="py-3 px-4 font-medium text-center">Status</th>
                  <th className="py-3 px-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {entries.map((entry) => {
                  const isExpense = entry.entryType === 'expense'
                  const isRevenue = entry.entryType === 'revenue'
                  const categoryInfo = CATEGORY_TAGS[entry.category] || CATEGORY_TAGS.general
                  const isMyEntry = entry.recordedBy?._id === user?.id || entry.recordedBy === user?.id
                  const canDelete = isLeader || (isMyEntry && entry.approvalStatus === 'pending')

                  return (
                    <tr key={entry._id} className="hover:bg-zinc-900/40 transition-colors">
                      {/* Date */}
                      <td className="py-3 px-4 font-mono text-zinc-400 whitespace-nowrap">
                        {new Date(entry.entryDate || entry.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Type & Category */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${
                              isExpense
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : isRevenue
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-300'
                            }`}
                          >
                            {isExpense ? <ArrowDownRight size={11} /> : <ArrowUpRight size={11} />}
                            {entry.entryType.toUpperCase()}
                          </span>
                          <span className={`badge ${categoryInfo.color} text-[10px]`}>
                            {categoryInfo.label}
                          </span>
                        </div>
                      </td>

                      {/* Description & Reference */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-medium text-zinc-200 truncate">{entry.description}</div>
                        {entry.documentReference && (
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <FileText size={11} className="text-zinc-500 shrink-0" />
                            <span className="truncate">{entry.documentReference}</span>
                          </div>
                        )}
                      </td>

                      {/* Recorded By */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-300 font-bold">
                            {entry.recordedBy?.displayName?.[0] || entry.recordedBy?.username?.[0] || 'U'}
                          </div>
                          <span className="text-zinc-300">
                            {entry.recordedBy?.displayName || entry.recordedBy?.username || 'Member'}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className={`py-3 px-4 text-right font-mono font-semibold whitespace-nowrap ${
                        isExpense ? 'text-zinc-200' : isRevenue ? 'text-emerald-400' : 'text-zinc-300'
                      }`}>
                        {isExpense ? '-' : '+'}{formatPaise(entry.amountPaise)}
                      </td>

                      {/* Approval Status Chip */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {entry.approvalStatus === 'pending' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse">
                            <Clock size={11} /> Pending Review
                          </span>
                        ) : entry.approvalStatus === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle size={11} /> Approved
                          </span>
                        ) : entry.approvalStatus === 'rejected' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle size={11} /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-400 bg-zinc-800/80">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLeader && entry.approvalStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => handleDecision(entry._id, 'approved')}
                                disabled={actionLoadingId === entry._id}
                                title="Approve expense"
                                className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 transition-colors"
                              >
                                <Check size={13} />
                              </button>
                              <button
                                onClick={() => handleDecision(entry._id, 'rejected')}
                                disabled={actionLoadingId === entry._id}
                                title="Reject expense"
                                className="p-1.5 rounded-lg bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 transition-colors"
                              >
                                <X size={13} />
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(entry._id)}
                              disabled={actionLoadingId === entry._id}
                              title="Delete entry"
                              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Record Entry Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-lg w-full p-6 relative border-zinc-700 bg-zinc-950 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="text-indigo-400" size={18} />
                <h3 className="text-base font-bold text-white">Record Ledger Entry</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEntry} className="space-y-4">
              {/* Entry Type Toggle */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Entry Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, entryType: 'expense', category: 'maintenance' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      form.entryType === 'expense'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ArrowDownRight size={14} /> Co-op Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, entryType: 'revenue', category: 'revenue' })}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                      form.entryType === 'revenue'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <ArrowUpRight size={14} /> Co-op Revenue
                  </button>
                </div>
              </div>

              {/* Amount in Rupees */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Amount in Rupees (₹) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-400 text-sm font-mono">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    placeholder="e.g. 1200"
                    value={form.amountRupees}
                    onChange={(e) => setForm({ ...form, amountRupees: e.target.value })}
                    required
                    className="input w-full pl-8 font-mono text-sm"
                  />
                </div>
                {form.amountRupees && !isNaN(parseFloat(form.amountRupees)) && (
                  <p className="text-[11px] text-zinc-500 font-mono mt-1">
                    = {Math.round(parseFloat(form.amountRupees) * 100).toLocaleString('en-IN')} integer paise
                    {form.entryType === 'expense' && parseFloat(form.amountRupees) >= (summary?.approvalThresholdPaise || 100000) / 100 && (
                      <span className="text-amber-400 ml-1.5 font-sans">
                        (≥ ₹{thresholdRupees} threshold — will require leader review)
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="input w-full text-xs"
                >
                  <option value="maintenance">Maintenance & Servicing</option>
                  <option value="repairs">Repairs & Replacements</option>
                  <option value="supplies">Consumables & Supplies</option>
                  <option value="equipment">Hardware & Attachments</option>
                  <option value="subscription">Shared Software / Subscription</option>
                  <option value="insurance">Insurance & Security</option>
                  <option value="revenue">Client Rental / Service Fee</option>
                  <option value="general">General Co-op Operating Cost</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 15m optical HDMI cables & quick-release plate for cinema kit"
                  required
                  className="input w-full text-xs resize-none"
                />
              </div>

              {/* Document Reference / Receipt */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Receipt / Invoice Reference (Optional)
                </label>
                <input
                  type="text"
                  value={form.documentReference}
                  onChange={(e) => setForm({ ...form, documentReference: e.target.value })}
                  placeholder="e.g. Amazon Order #402-99120 or Receipt #REC-108"
                  className="input w-full text-xs font-mono"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Transaction Date</label>
                <input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                  className="input w-full text-xs font-mono"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary btn-sm text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary btn-sm text-xs"
                >
                  {submitting ? 'Recording...' : 'Confirm Ledger Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

