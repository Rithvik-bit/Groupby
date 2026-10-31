import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { User, Save, MapPin, Eye, Lock, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Profile() {
  const { user, updateProfile, changePassword, deactivateAccount } = useAuth()
  const [tab, setTab] = useState('profile')
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    city: user?.city || '',
    state: user?.state || '',
    country: user?.country || '',
    interests: (user?.interests || []).join(', '),
    skills: (user?.skills || []).join(', '),
    profileVisibility: user?.profileVisibility || 'public',
    showEmail: user?.showEmail || false,
    showBudget: user?.showBudget || false,
  })
  const [loading, setLoading] = useState(false)

  // Security state
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [passLoading, setPassLoading] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setLoading(true)
    try {
      const payload = {
        displayName: form.displayName,
        bio: form.bio,
        city: form.city,
        state: form.state,
        country: form.country,
        interests: form.interests.split(',').map((s) => s.trim()).filter(Boolean),
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
        profileVisibility: form.profileVisibility,
        showEmail: form.showEmail,
        showBudget: form.showBudget,
      }
      await updateProfile(payload)
      toast.success('Profile updated successfully!')
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('New passwords do not match')
      return
    }
    setPassLoading(true)
    try {
      await changePassword(passwords.currentPassword, passwords.newPassword)
      toast.success('Password changed successfully! Please log in again.')
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Password update failed')
    } finally {
      setPassLoading(false)
    }
  }

  const handleDeactivate = async () => {
    if (!window.confirm('Are you sure you want to deactivate your account? This will terminate all active sessions.')) {
      return
    }
    setDeactivating(true)
    try {
      await deactivateAccount()
      toast.success('Account deactivated.')
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Deactivation failed')
    } finally {
      setDeactivating(false)
    }
  }

  const initials =
    user?.displayName?.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase() ||
    user?.username?.slice(0, 2).toUpperCase() ||
    'GB'

  return (
    <div className="max-w-2xl mx-auto animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
          My Profile
        </h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Manage your account settings, privacy, and identity
        </p>
      </div>

      {/* Avatar + basic info */}
      <div className="glass-card p-6 flex items-center gap-5">
        <div className="avatar avatar-xl">{initials}</div>
        <div>
          <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            {user?.displayName || user?.username}
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>@{user?.username}</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge badge-${user?.isEmailVerified ? 'success' : 'warning'}`}>
              {user?.isEmailVerified ? '✓ Email Verified' : 'Email Unverified'}
            </span>
            <span className="badge badge-neutral">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {[
          { id: 'profile', label: 'Profile', icon: User },
          { id: 'privacy', label: 'Privacy', icon: Eye },
          { id: 'security', label: 'Security', icon: Lock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            id={`profile-tab-${id}`}
            onClick={() => setTab(id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-all"
            style={{
              background: tab === id ? 'var(--gradient-primary)' : 'transparent',
              color: tab === id ? 'white' : 'var(--text-secondary)',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="glass-card p-6">
        {tab === 'profile' && (
          <div className="space-y-4">
            <div className="form-group">
              <label className="label">Display Name</label>
              <input
                className="input"
                value={form.displayName}
                onChange={(e) => set('displayName', e.target.value)}
                maxLength={60}
              />
            </div>
            <div className="form-group">
              <label className="label">Bio</label>
              <textarea
                className="input"
                rows={3}
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                maxLength={500}
                placeholder="Tell your group members about yourself..."
                style={{ resize: 'vertical' }}
              />
            </div>
            <div className="form-group">
              <label className="label">Interests (comma-separated)</label>
              <input
                className="input"
                value={form.interests}
                onChange={(e) => set('interests', e.target.value)}
                placeholder="photography, electronics, 3d printing..."
              />
            </div>
            <div className="form-group">
              <label className="label">Skills (comma-separated)</label>
              <input
                className="input"
                value={form.skills}
                onChange={(e) => set('skills', e.target.value)}
                placeholder="management, photography, coding..."
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['city', 'state', 'country'].map((f) => (
                <div key={f} className="form-group">
                  <label className="label">{f.charAt(0).toUpperCase() + f.slice(1)}</label>
                  <input className="input" value={form[f]} onChange={(e) => set(f, e.target.value)} />
                </div>
              ))}
            </div>

            <div className="divider" />
            <button id="save-profile-btn" className="btn-primary" onClick={handleSave} disabled={loading}>
              <Save size={15} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {tab === 'privacy' && (
          <div className="space-y-5">
            <div className="form-group">
              <label className="label">Profile Visibility</label>
              <select
                className="select"
                value={form.profileVisibility}
                onChange={(e) => set('profileVisibility', e.target.value)}
              >
                <option value="public">Public — Visible to everyone</option>
                <option value="members_only">Members Only — Visible to group members</option>
                <option value="private">Private — Only you</option>
              </select>
            </div>
            <div className="space-y-3">
              {[
                { key: 'showEmail', label: 'Show email address to group members' },
                { key: 'showBudget', label: 'Show budget range in member matching' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--bg-card-hover)', border: '1px solid var(--border)' }}
                >
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{label}</span>
                  <button
                    id={`toggle-${key}`}
                    onClick={() => set(key, !form[key])}
                    className="w-10 h-5 rounded-full transition-all relative"
                    style={{ background: form[key] ? '#6366f1' : 'var(--border-light)' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: form[key] ? 'calc(100% - 18px)' : '2px' }}
                    />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <p className="text-xs" style={{ color: '#818cf8' }}>
                <strong>Privacy Note:</strong> Your email, financial records, and private messages are never exposed to other users regardless of these settings. Only the fields you explicitly choose to share are visible.
              </p>
            </div>

            <div className="divider" />
            <button id="save-privacy-btn" className="btn-primary" onClick={handleSave} disabled={loading}>
              <Save size={15} />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}

        {tab === 'security' && (
          <div className="space-y-6">
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Change Password
              </h3>
              <div className="form-group">
                <label className="label">Current Password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">New Password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={passwords.newPassword}
                  onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="label">Confirm New Password</label>
                <input
                  type="password"
                  required
                  className="input"
                  value={passwords.confirmPassword}
                  onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                />
              </div>
              <button type="submit" disabled={passLoading} className="btn-primary">
                {passLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>

            <div className="divider" />

            <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/10 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                <AlertTriangle size={16} /> Danger Zone
              </div>
              <p className="text-xs text-red-300">
                Deactivating your account will disable your profile and revoke all active sessions. This action cannot be immediately reversed without administrator assistance.
              </p>
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={deactivating}
                className="btn-danger text-xs py-1.5 px-3"
              >
                {deactivating ? 'Deactivating...' : 'Deactivate Account'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
