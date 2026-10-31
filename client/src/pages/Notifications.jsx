import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import { Bell, CheckCheck, Mail, UserCheck, UserX, AlertCircle, Shield, Info } from 'lucide-react'
import toast from 'react-hot-toast'

function timeAgo(date) {
  const diff = Date.now() - new Date(date).getTime()
  if (diff < 60000) return 'just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(date).toLocaleDateString()
}

function getIcon(type) {
  switch (type) {
    case 'group_invite':
      return <Mail size={16} className="text-indigo-400" />
    case 'join_approved':
      return <UserCheck size={16} className="text-emerald-400" />
    case 'join_rejected':
      return <UserX size={16} className="text-red-400" />
    case 'role_changed':
      return <Shield size={16} className="text-amber-400" />
    case 'group_cancelled':
      return <AlertCircle size={16} className="text-red-400" />
    default:
      return <Info size={16} className="text-blue-400" />
  }
}

export default function Notifications() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`/notifications?unreadOnly=${filter === 'unread'}`)
      setNotifications(res.data.data || [])
      setUnreadCount(res.data.unreadCount || 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accessToken) fetchNotifications()
  }, [accessToken, filter])

  const handleMarkAsRead = async (id, link) => {
    try {
      await api.patch(`/notifications/${id}/read`)
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
      if (link) navigate(link)
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await api.post('/notifications/read-all')
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
      toast.success('All marked as read')
    } catch (err) {
      toast.error('Failed to mark all as read')
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
            Notifications
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Updates regarding your group memberships, invitations, and roles
          </p>
        </div>

        {unreadCount > 0 && (
          <button onClick={handleMarkAllAsRead} className="btn-secondary btn-sm flex items-center gap-1.5">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`btn-sm ${filter === 'unread' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-1.5`}
        >
          Unread {unreadCount > 0 && <span className="badge badge-primary text-xs py-0 px-1.5">{unreadCount}</span>}
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <div className="empty-state glass-card p-12 text-center">
          <div className="empty-state-icon mx-auto mb-3 flex items-center justify-center w-12 h-12 rounded-2xl" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Bell size={24} color="#818cf8" />
          </div>
          <h3 className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No notifications</h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>You are completely caught up!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n._id}
              onClick={() => handleMarkAsRead(n._id, n.link)}
              className={`glass-card p-4 flex items-start gap-3 cursor-pointer transition-all hover:scale-[1.005] ${
                !n.isRead ? 'border-l-4 border-l-indigo-500' : ''
              }`}
            >
              <div className="p-2 rounded-xl mt-0.5" style={{ background: 'var(--bg-card)' }}>
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    {n.title}
                  </h4>
                  <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {n.body}
                </p>
              </div>
              {!n.isRead && (
                <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
