import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Mail, Check, X, Users, Clock, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Invitations() {
  const { accessToken } = useAuth()
  const [invitations, setInvitations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)

  const fetchInvitations = async () => {
    try {
      const res = await api.get('/groups/my/invitations')
      setInvitations(res.data.data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) fetchInvitations()
  }, [accessToken])

  const handleRespond = async (inviteId, action) => {
    setActionLoading(inviteId)
    try {
      await api.post(`/groups/invitations/${inviteId}/respond`, { action })
      toast.success(action === 'accept' ? 'Invitation accepted! Welcome to the group.' : 'Invitation declined.')
      fetchInvitations()
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to respond to invitation.')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          Group Invitations
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Review and respond to invitations from other group leaders
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
      ) : invitations.length === 0 ? (
        <div className="empty-state glass-card p-12 text-center">
          <div className="empty-state-icon mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Mail size={24} color="#818cf8" />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No pending invitations</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>When someone invites you to join their group, it will appear here.</p>
          <Link to="/groups" className="btn-primary btn-sm inline-flex">Explore Public Groups</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map(inv => {
            const grp = inv.group || {}
            const inviter = inv.invitedBy || {}

            return (
              <div key={inv._id} className="glass-card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="badge badge-primary text-xs">{grp.groupType?.replace('_', ' ')}</span>
                    <span className="badge badge-neutral text-xs">{grp.category}</span>
                  </div>
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                    {grp.title}
                  </h3>
                  <p className="text-xs line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
                    {grp.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs pt-1" style={{ color: 'var(--text-muted)', color: '#6b7280' }}>
                    <span>Invited by @{inviter.username || 'a leader'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      Expires: {new Date(inv.inviteExpiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleRespond(inv._id, 'accept')}
                    disabled={actionLoading === inv._id}
                    className="btn-primary btn-sm flex items-center gap-1.5"
                  >
                    <Check size={14} /> Accept
                  </button>
                  <button
                    onClick={() => handleRespond(inv._id, 'decline')}
                    disabled={actionLoading === inv._id}
                    className="btn-secondary btn-sm flex items-center gap-1.5 text-red-400 hover:text-red-300"
                  >
                    <X size={14} /> Decline
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
