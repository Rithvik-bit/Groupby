import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import api from '../services/api'
import {
  Users, MessageSquare, TrendingUp, ArrowLeft,
  Send, AlertCircle, MapPin, Calendar, DollarSign,
  Package, Shield, Clock, CheckCircle, UserPlus,
  UserMinus, LogOut, Check, X, Coins, Briefcase
} from 'lucide-react'
import toast from 'react-hot-toast'
import GroupAssets from '../components/GroupAssets'
import GroupFinancials from '../components/GroupFinancials'
import OwnershipTransfers from '../components/OwnershipTransfers'

function formatPaise(p) {
  return `₹${((p || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
}

const TYPE_COLORS = {
  collective_purchase: '#6366f1',
  shared_equipment: '#10b981',
  business_venture: '#f59e0b',
}
const TYPE_LABELS = {
  collective_purchase: 'Collective Purchase',
  shared_equipment: 'Shared Equipment',
  business_venture: 'Business Venture',
}

// ── Chat component ────────────────────────────────────────────────────────────
function GroupChat({ groupId, isMember, accessToken }) {
  const { socket } = useSocket()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [joined, setJoined] = useState(false)
  const bottomRef = useRef(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!isMember || !accessToken) return
    api.get(`/groups/${groupId}/chat`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    }).then(res => setMessages(res.data.data)).catch(console.error)
  }, [groupId, isMember, accessToken])

  useEffect(() => {
    if (!socket || !isMember) return
    socket.emit('join_group', { groupId })
    socket.on('joined_group', () => setJoined(true))
    socket.on('new_message', (msg) => {
      setMessages(prev => [...prev, msg])
    })
    return () => {
      socket.emit('leave_group', { groupId })
      socket.off('joined_group')
      socket.off('new_message')
    }
  }, [socket, groupId, isMember])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const text = input.trim()
    setInput('')
    try {
      const res = await api.post(`/groups/${groupId}/chat`, { content: text }, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      if (socket) {
        socket.emit('send_message', { groupId, content: text, messageId: res.data.data._id })
      }
    } catch {
      toast.error('Failed to send message')
    }
  }

  return (
    <div className="flex flex-col h-96">
      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {messages.map(m => {
          const isMe = m.sender?._id === user?.id || m.sender?.id === user?.id
          return (
            <div key={m._id} className={`flex gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="avatar avatar-sm text-xs mt-1">
                  {m.sender?.displayName?.[0] || m.sender?.username?.[0] || '?'}
                </div>
              )}
              <div className={`p-3 rounded-2xl max-w-xs text-sm ${isMe ? 'bg-indigo-600 text-white' : 'glass-card'}`}
                style={isMe ? { background: 'var(--gradient-primary)' } : {}}>
                {!isMe && <div className="text-xs font-semibold mb-1 opacity-70">@{m.sender?.username}</div>}
                <div>{m.content}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <input
          type="text"
          className="input flex-1"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
        />
        <button type="submit" className="btn-primary" disabled={!input.trim()}>
          <Send size={15} />
        </button>
      </form>
    </div>
  )
}

// ── Main Group Detail Component ───────────────────────────────────────────────
export default function GroupDetail() {
  const { groupId } = useParams()
  const { user, accessToken } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState(null)
  const [members, setMembers] = useState([])
  const [requests, setRequests] = useState([])
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [joining, setJoining] = useState(false)
  const [inviteInput, setInviteInput] = useState('')
  const [inviting, setInviting] = useState(false)
  const [settingsForm, setSettingsForm] = useState({ title: '', description: '', rules: '', cancellationRules: '', status: '' })
  const [updatingSettings, setUpdatingSettings] = useState(false)

  // Leave & Succession modal state
  const [leaveModalOpen, setLeaveModalOpen] = useState(false)
  const [selectedSuccessor, setSelectedSuccessor] = useState('')
  const [leaving, setLeaving] = useState(false)

  // Contribution state
  const [contributeModalOpen, setContributeModalOpen] = useState(false)
  const [contributeAmount, setContributeAmount] = useState('')
  const [contributeNote, setContributeNote] = useState('')
  const [contributing, setContributing] = useState(false)
  const [contributions, setContributions] = useState([])

  const fetchGroup = useCallback(async () => {
    try {
      const res = await api.get(`/groups/${groupId}`)
      setGroup(res.data.data)
      setSettingsForm({
        title: res.data.data.title || '',
        description: res.data.data.description || '',
        rules: res.data.data.rules || '',
        cancellationRules: res.data.data.cancellationRules || '',
        status: res.data.data.status || 'open',
      })
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Group not found or private.')
        navigate('/groups')
      }
    } finally {
      setLoading(false)
    }
  }, [groupId, navigate])

  const fetchMembers = useCallback(async () => {
    if (!accessToken) return
    try {
      const res = await api.get(`/groups/${groupId}/members`)
      setMembers(res.data.data)
    } catch {
      // not a member or private
    }
  }, [groupId, accessToken])

  const fetchRequestsAndInvites = useCallback(async () => {
    if (!accessToken) return
    try {
      const [reqRes, invRes] = await Promise.all([
        api.get(`/groups/${groupId}/requests`).catch(() => ({ data: { data: [] } })),
        api.get(`/groups/${groupId}/invitations`).catch(() => ({ data: { data: [] } })),
      ])
      setRequests(reqRes.data.data || [])
      setInvitations(invRes.data.data || [])
    } catch {
      // ignore if not authorized
    }
  }, [groupId, accessToken])

  useEffect(() => {
    fetchGroup()
  }, [fetchGroup])

  useEffect(() => {
    if (group) {
      fetchMembers()
      fetchRequestsAndInvites()
    }
  }, [group, fetchMembers, fetchRequestsAndInvites])

  const myMembership = members.find(m => (m.user?._id || m.user?.id || m.user) === user?.id)
  const isMember = Boolean(myMembership)
  const memberRole = myMembership?.role || group?.viewerRole
  const isLeader = ['owner', 'admin', 'moderator'].includes(memberRole)
  const isOwner = memberRole === 'owner' || user?.role === 'admin'

  const fetchContributions = useCallback(async () => {
    if (!accessToken || !isMember) return
    try {
      const res = await api.get(`/groups/${groupId}/contributions`)
      setContributions(res.data.data || [])
    } catch {
      // not a member or unauthorized
    }
  }, [groupId, accessToken, isMember])

  useEffect(() => {
    if (isMember) {
      fetchContributions()
    }
  }, [isMember, fetchContributions])

  const handleContribute = async (e) => {
    e.preventDefault()
    const amountRupees = parseFloat(contributeAmount)
    if (!amountRupees || amountRupees <= 0) {
      return toast.error('Please enter a valid contribution amount in rupees.')
    }
    const amountPaise = Math.round(amountRupees * 100)
    setContributing(true)
    try {
      await api.post(`/groups/${groupId}/contributions`, {
        amountPaise,
        note: contributeNote.trim(),
      })
      toast.success(`Successfully simulated contribution of ₹${amountRupees.toLocaleString('en-IN')}!`)
      setContributeModalOpen(false)
      setContributeAmount('')
      setContributeNote('')
      fetchGroup()
      fetchContributions()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Contribution failed.')
    } finally {
      setContributing(false)
    }
  }

  const handleJoin = async () => {
    setJoining(true)
    try {
      await api.post(`/groups/${groupId}/join`)
      toast.success('Join request submitted!')
      fetchGroup()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to join group.')
    } finally {
      setJoining(false)
    }
  }

  const handleDecision = async (memberId, decision) => {
    try {
      await api.patch(`/groups/${groupId}/requests/${memberId}`, { decision })
      toast.success(`Request ${decision === 'approve' ? 'approved' : 'rejected'}!`)
      fetchGroup()
      fetchMembers()
      fetchRequestsAndInvites()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Action failed.')
    }
  }

  const handleSendInvite = async (e) => {
    e.preventDefault()
    if (!inviteInput.trim()) return
    setInviting(true)
    try {
      await api.post(`/groups/${groupId}/invitations`, { identifier: inviteInput.trim() })
      toast.success('Invitation dispatched!')
      setInviteInput('')
      fetchRequestsAndInvites()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to send invitation.')
    } finally {
      setInviting(false)
    }
  }

  const handleRevokeInvite = async (inviteId) => {
    try {
      await api.delete(`/groups/${groupId}/invitations/${inviteId}`)
      toast.success('Invitation revoked.')
      fetchRequestsAndInvites()
    } catch (err) {
      toast.error('Failed to revoke invitation.')
    }
  }

  const handleRoleChange = async (memberId, newRole) => {
    try {
      await api.patch(`/groups/${groupId}/members/${memberId}/role`, { role: newRole })
      toast.success(`Member role updated to ${newRole}!`)
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update role.')
    }
  }

  const handleRemoveMember = async (memberId, username) => {
    if (!window.confirm(`Are you sure you want to remove @${username} from the group?`)) return
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`)
      toast.success(`Member @${username} removed.`)
      fetchGroup()
      fetchMembers()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to remove member.')
    }
  }

  const handleLeaveGroup = async () => {
    setLeaving(true)
    try {
      await api.post(`/groups/${groupId}/leave`, {
        newOwnerId: selectedSuccessor || undefined,
      })
      toast.success('You have left the group.')
      setLeaveModalOpen(false)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to leave group.')
    } finally {
      setLeaving(false)
    }
  }

  const handleUpdateSettings = async (e) => {
    e.preventDefault()
    setUpdatingSettings(true)
    try {
      await api.patch(`/groups/${groupId}`, settingsForm)
      toast.success('Group settings updated!')
      fetchGroup()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to update settings.')
    } finally {
      setUpdatingSettings(false)
    }
  }

  const handleCancelGroup = async () => {
    const reason = window.prompt('Please provide a reason for cancelling this group:')
    if (reason === null) return
    try {
      await api.post(`/groups/${groupId}/cancel`, { reason: reason || 'Cancelled by leader' })
      toast.success('Group cancelled.')
      fetchGroup()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to cancel group.')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="skeleton h-10 w-48 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }
  if (!group) return null

  const color = TYPE_COLORS[group.groupType] || '#6366f1'
  const progress = group.targetAmountPaise > 0
    ? Math.min(100, (group.currentAmountPaise / group.targetAmountPaise) * 100)
    : null

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: `Members (${members.length || group.memberCount})` },
    ...(isMember ? [{ id: 'assets', label: 'Assets & Booking' }] : []),
    ...(isMember ? [{ id: 'financials', label: 'Financials & Ledger' }] : []),
    ...(isMember ? [{ id: 'transfers', label: 'Ownership & Transfers' }] : []),
    ...(isLeader ? [{ id: 'requests', label: `Requests (${requests.length})` }] : []),
    ...(isMember ? [{ id: 'chat', label: 'Group Chat' }] : []),
    ...(isLeader ? [{ id: 'settings', label: 'Settings' }] : []),
  ]

  const otherMembers = members.filter(m => (m.user?._id || m.user?.id || m.user) !== user?.id)

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Back button */}
      <button onClick={() => navigate('/groups')} className="flex items-center gap-2 text-sm hover:underline"
        style={{ color: 'var(--text-secondary)' }}>
        <ArrowLeft size={15} /> Back to Groups
      </button>

      {/* Header Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="badge" style={{ background: `${color}18`, color, border: `1px solid ${color}30` }}>
                {TYPE_LABELS[group.groupType]}
              </span>
              <span className={`badge badge-${group.status === 'active' ? 'success' : group.status === 'funding' ? 'warning' : 'neutral'}`}>
                {group.status}
              </span>
              <span className="badge badge-neutral">{group.visibility}</span>
              {group.title?.includes('[DEMO]') && <span className="badge badge-demo">DEMO</span>}
            </div>

            <h1 className="text-2xl font-black mb-2" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              {group.title?.replace('[DEMO] ', '')}
            </h1>

            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {group.description?.replace('[SAMPLE DATA]', '').trim()}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
              <span className="flex items-center gap-1"><Users size={13} /> {group.memberCount}/{group.maxMembers} members</span>
              {group.city && <span className="flex items-center gap-1"><MapPin size={13} /> {group.city}, {group.state}</span>}
              {group.fundingDeadline && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  Deadline: {new Date(group.fundingDeadline).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
            {isMember ? (
              <div className="flex flex-col sm:items-end gap-2">
                <div className="flex items-center gap-2">
                  <div className="badge badge-success flex items-center gap-1">
                    <CheckCircle size={12} /> {memberRole}
                  </div>
                  <button
                    onClick={() => setContributeModalOpen(true)}
                    className="btn-primary btn-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                  >
                    <Coins size={13} /> Contribute
                  </button>
                </div>
                <button
                  onClick={() => setLeaveModalOpen(true)}
                  className="btn-secondary btn-sm flex items-center gap-1 text-red-400 hover:text-red-300"
                >
                  <LogOut size={13} /> Leave Group
                </button>
              </div>
            ) : user ? (
              <button id="join-group-btn" className="btn-primary" onClick={handleJoin} disabled={joining}>
                {joining ? 'Requesting...' : 'Request to Join'}
              </button>
            ) : (
              <button onClick={() => navigate('/login')} className="btn-primary">Sign in to Join</button>
            )}
          </div>
        </div>

        {progress !== null && (
          <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {formatPaise(group.currentAmountPaise)} raised
              </span>
              <span style={{ color }}>
                {progress.toFixed(1)}% of {formatPaise(group.targetAmountPaise)}
              </span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}88)` }} />
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            onClick={() => setTab(t.id)}
            className="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === t.id ? 'var(--gradient-primary)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--text-secondary)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="glass-card p-6">
        {/* Tab 1: Overview */}
        {tab === 'overview' && (
          <div className="space-y-6">
            <h2 className="section-title">Overview & Group Rules</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { icon: DollarSign, label: 'Target Amount', value: group.targetAmountPaise ? formatPaise(group.targetAmountPaise) : '—' },
                { icon: TrendingUp, label: 'Raised (Simulated)', value: formatPaise(group.currentAmountPaise) },
                { icon: Users, label: 'Membership Capacity', value: `${group.memberCount} of ${group.maxMembers} max` },
                { icon: Shield, label: 'Category', value: group.category },
              ].map(({ icon: Icon, label, value }, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-card-hover)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                    <Icon size={15} color="#6366f1" />
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{label}</div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Venture Specific Overview */}
            {group.groupType === 'business_venture' && group.venture && (
              <div className="p-5 rounded-xl border space-y-4" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white text-base">Venture Operations &amp; Surplus</h3>
                  </div>
                  <span className="badge badge-warning text-xs capitalize">{group.venture.status || 'Active'}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-black/40 border border-neutral-800">
                    <span className="text-[11px] text-zinc-400">Total Venture Revenue</span>
                    <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
                      {formatPaise(group.venture.totalRevenuePaise || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-neutral-800">
                    <span className="text-[11px] text-zinc-400">Total Operating Expenses</span>
                    <div className="text-lg font-bold font-mono text-rose-400 mt-0.5">
                      {formatPaise(group.venture.totalExpensePaise || 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-black/40 border border-neutral-800">
                    <span className="text-[11px] text-zinc-400">Net Surplus for Allocation</span>
                    <div className="text-lg font-bold font-mono text-indigo-400 mt-0.5">
                      {formatPaise((group.venture.totalRevenuePaise || 0) - (group.venture.totalExpensePaise || 0))}
                    </div>
                  </div>
                </div>

                {group.venture.surplusAllocationRules && (
                  <div className="text-xs p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-1">
                    <strong className="text-amber-300 font-semibold">Surplus Allocation Rules:</strong>
                    <p className="text-neutral-300">{group.venture.surplusAllocationRules}</p>
                  </div>
                )}

                {group.venture.exitRules && (
                  <div className="text-xs p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-1">
                    <strong className="text-indigo-300 font-semibold">Exit &amp; Transfer Guidelines:</strong>
                    <p className="text-neutral-300">{group.venture.exitRules}</p>
                  </div>
                )}

                <p className="text-[11px] text-zinc-500 italic">
                  ⚠️ {group.venture.legalDisclaimer || 'This venture is a collaborative record-keeping tool. It does not constitute a legally registered business or investment vehicle.'}
                </p>
              </div>
            )}

            {group.rules && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Agreed Group Rules</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{group.rules}</p>
              </div>
            )}

            {group.cancellationRules && (
              <div className="p-4 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Cancellation Policy</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{group.cancellationRules}</p>
              </div>
            )}

            {/* Precision & Basis Points info card */}
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Coins size={16} className="text-amber-400 shrink-0" />
                <span className="text-slate-300">
                  Precision: Stored in <strong className="text-amber-400">paise</strong> (₹1 = 100 paise) · Equity tracked in <strong className="text-purple-400">10,000 Basis Points</strong> (100.00%).
                </span>
              </div>
              {isMember && (
                <button
                  onClick={() => setContributeModalOpen(true)}
                  className="btn-primary btn-sm text-xs py-1 px-3 whitespace-nowrap"
                >
                  <Coins size={12} /> Simulate Contribution
                </button>
              )}
            </div>

            {/* Syndicate Contribution Ledger */}
            {isMember && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={15} className="text-emerald-400" />
                    <span>Recent Contributions ({contributions.length})</span>
                  </h3>
                  <span className="text-[11px] text-amber-400/90 font-medium">⚡ Simulated Ledger</span>
                </div>

                {contributions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No contributions recorded yet. Be the first to contribute!</p>
                ) : (
                  <div className="space-y-2">
                    {contributions.slice(0, 5).map(c => (
                      <div key={c._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center text-xs">
                            ₹
                          </div>
                          <div>
                            <div className="font-semibold text-white">
                              {c.user?.displayName || c.user?.username || 'Member'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(c.createdAt).toLocaleString()} {c.note && `· "${c.note}"`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-400 font-mono">
                            +{formatPaise(c.amountPaise)}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {c.amountPaise.toLocaleString()} paise
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Members */}
        {tab === 'members' && (
          <div className="space-y-4">
            <h2 className="section-title">Active Members ({members.length})</h2>
            <div className="divide-y divide-white/5">
              {members.map(m => {
                const memberUser = m.user || {}
                const isTargetOwner = m.role === 'owner'
                const isSelf = memberUser._id === user?.id || memberUser.id === user?.id

                return (
                  <div key={m._id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="avatar avatar-sm text-xs">
                        {memberUser.displayName?.[0] || memberUser.username?.[0] || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                          {memberUser.displayName || memberUser.username} {isSelf && '(You)'}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          @{memberUser.username} • Joined {new Date(m.joinedAt || m.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`badge badge-${m.role === 'owner' ? 'primary' : m.role === 'moderator' ? 'warning' : 'neutral'}`}>
                        {m.role}
                      </span>

                      {/* Owner controls */}
                      {isOwner && !isSelf && !isTargetOwner && (
                        <select
                          className="select text-xs py-1 px-2"
                          value={m.role}
                          onChange={(e) => handleRoleChange(m._id, e.target.value)}
                        >
                          <option value="moderator">Moderator</option>
                          <option value="member">Member</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}

                      {/* Removal button */}
                      {isLeader && !isSelf && !isTargetOwner && (
                        <button
                          onClick={() => handleRemoveMember(m._id, memberUser.username)}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"
                          title="Remove member"
                        >
                          <UserMinus size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Requests & Invitations (Leader view) */}
        {tab === 'requests' && isLeader && (
          <div className="space-y-6">
            {/* Send Invitation Form */}
            <div>
              <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Invite a Member</h3>
              <form onSubmit={handleSendInvite} className="flex gap-2">
                <input
                  type="text"
                  className="input flex-1"
                  placeholder="Enter username or email address..."
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value)}
                />
                <button type="submit" className="btn-primary" disabled={inviting || !inviteInput.trim()}>
                  <UserPlus size={15} /> {inviting ? 'Inviting...' : 'Send Invite'}
                </button>
              </form>
            </div>

            {/* Pending Join Requests */}
            <div>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                Pending Join Requests ({requests.length})
              </h3>
              {requests.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No pending join requests.</p>
              ) : (
                <div className="space-y-2">
                  {requests.map(r => (
                    <div key={r._id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {r.user?.displayName || r.user?.username} (@{r.user?.username})
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Requested on {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecision(r._id, 'approve')}
                          className="btn-primary btn-sm flex items-center gap-1"
                        >
                          <Check size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleDecision(r._id, 'reject')}
                          className="btn-secondary btn-sm flex items-center gap-1 text-red-400"
                        >
                          <X size={14} /> Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sent Pending Invitations */}
            <div>
              <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                Sent Invitations ({invitations.length})
              </h3>
              {invitations.length === 0 ? (
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No pending sent invitations.</p>
              ) : (
                <div className="space-y-2">
                  {invitations.map(inv => (
                    <div key={inv._id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'var(--bg-card)' }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          @{inv.user?.username} ({inv.user?.displayName})
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Expires: {new Date(inv.inviteExpiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevokeInvite(inv._id)}
                        className="btn-secondary btn-sm text-red-400"
                      >
                        Revoke
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 3: Assets & Booking */}
        {tab === 'assets' && isMember && (
          <GroupAssets groupId={groupId} isLeader={isLeader} isOwner={isOwner} />
        )}

        {/* Tab 3.5: Financials & Ledger */}
        {tab === 'financials' && isMember && (
          <GroupFinancials groupId={groupId} isLeader={isLeader} isOwner={isOwner} />
        )}

        {/* Tab 3.7: Ownership & Transfers */}
        {tab === 'transfers' && isMember && (
          <OwnershipTransfers groupId={groupId} isLeader={isLeader} members={members} />
        )}

        {/* Tab 4: Chat */}
        {tab === 'chat' && (
          <GroupChat groupId={groupId} isMember={isMember} accessToken={accessToken} />
        )}

        {/* Tab 5: Settings (Leader view) */}
        {tab === 'settings' && isLeader && (
          <div className="space-y-6">
            <h2 className="section-title">Group Settings & Lifecycle</h2>
            <form onSubmit={handleUpdateSettings} className="space-y-4">
              <div className="form-group">
                <label className="label">Group Title</label>
                <input
                  className="input"
                  value={settingsForm.title}
                  onChange={(e) => setSettingsForm({ ...settingsForm, title: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Group Rules</label>
                <textarea
                  className="input"
                  rows={2}
                  value={settingsForm.rules}
                  onChange={(e) => setSettingsForm({ ...settingsForm, rules: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Lifecycle Transition Status</label>
                <select
                  className="select"
                  value={settingsForm.status}
                  onChange={(e) => setSettingsForm({ ...settingsForm, status: e.target.value })}
                >
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="funding">Funding</option>
                  <option value="funded">Funded</option>
                  <option value="purchasing">Purchasing</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" className="btn-primary" disabled={updatingSettings}>
                  {updatingSettings ? 'Saving...' : 'Save Settings'}
                </button>
                {isOwner && group.status !== 'cancelled' && (
                  <button
                    type="button"
                    onClick={handleCancelGroup}
                    className="btn-secondary text-red-400 hover:text-red-300 ml-auto"
                  >
                    Cancel Group
                  </button>
                )}
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Leave Group & Succession Modal */}
      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
          <div className="glass-card max-w-md w-full p-6 space-y-4 animate-scale-in">
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Leave Group</h3>
            {isOwner ? (
              otherMembers.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    As the group owner, you must pass ownership to another member before leaving, or an active moderator/member will be chosen automatically.
                  </p>
                  <div className="form-group">
                    <label className="label">Select Successor (Optional)</label>
                    <select
                      className="select text-xs"
                      value={selectedSuccessor}
                      onChange={(e) => setSelectedSuccessor(e.target.value)}
                    >
                      <option value="">Automatic Succession (Earliest member)</option>
                      {otherMembers.map(m => (
                        <option key={m.user?._id || m.user?.id} value={m.user?._id || m.user?.id}>
                          @{m.user?.username} ({m.role})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-400">
                  You are the sole member of this group. Leaving will automatically cancel and archive the group.
                </p>
              )
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                Are you sure you want to leave this group? You will lose access to member-only discussions and records.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button className="btn-secondary btn-sm" onClick={() => setLeaveModalOpen(false)}>Cancel</button>
              <button className="btn-primary btn-sm bg-red-600 hover:bg-red-700" onClick={handleLeaveGroup} disabled={leaving}>
                {leaving ? 'Leaving...' : 'Confirm Departure'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Simulated Contribution Modal */}
      {contributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="glass-card max-w-md w-full p-6 space-y-4 border border-indigo-500/30 shadow-2xl">
            <div className="flex items-start justify-between border-b pb-3" style={{ borderColor: 'var(--border)' }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                  <Coins size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Simulate Contribution</h3>
                  <div className="text-[11px] text-slate-400">Zero-risk simulated payment sandbox</div>
                </div>
              </div>
              <button onClick={() => setContributeModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleContribute} className="space-y-4">
              <div className="sim-notice">
                <AlertCircle size={14} className="shrink-0" />
                <span>Simulated mode: No real money is collected. Funds will be added directly to the group's paise ledger.</span>
              </div>

              <div className="form-group">
                <label className="label">Contribution Amount (INR ₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="e.g. 5000"
                    value={contributeAmount}
                    onChange={(e) => setContributeAmount(e.target.value)}
                    className="input pl-8 font-mono text-base"
                    required
                  />
                </div>
                {contributeAmount && Number(contributeAmount) > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-1">
                    <span>Stored as integer paise:</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      {(Math.round(Number(contributeAmount) * 100)).toLocaleString()} paise
                    </span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="label">Note / Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Initial member capital share"
                  value={contributeNote}
                  onChange={(e) => setContributeNote(e.target.value)}
                  className="input text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => setContributeModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary btn-sm"
                  disabled={contributing || !contributeAmount || Number(contributeAmount) <= 0}
                >
                  {contributing ? 'Processing...' : 'Confirm Simulated Contribution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
