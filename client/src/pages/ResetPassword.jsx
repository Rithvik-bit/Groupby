import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '../components/Logo'

export default function ResetPassword() {
  const { token } = useParams()
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordChecks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Contains a number', ok: /[0-9]/.test(password) },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (!passwordChecks.every((c) => c.ok)) {
      setError('Password does not meet complexity requirements.')
      return
    }

    setLoading(true)
    try {
      await resetPassword(token, password)
      toast.success('Password reset successfully! Please log in.')
      navigate('/login')
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Password reset link is invalid or expired.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="mb-6">
        <Logo variant="full" size="md" to="/" />
      </div>
      <div className="w-full max-w-md animate-fade-in card p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#818cf8' }}>
            <KeyRound size={24} />
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Choose a new password
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Please enter your new secure password below.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#f87171' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="label">New password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                required
                className="input pr-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
              >
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="label">Confirm new password</label>
            <input
              type="password"
              required
              className="input"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {/* Validation Checklist */}
          <div className="p-3 rounded-xl space-y-1 text-xs"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            {passwordChecks.map((c) => (
              <div key={c.label} className="flex items-center gap-2" style={{ color: c.ok ? '#10b981' : 'var(--text-secondary)' }}>
                <CheckCircle2 size={12} />
                <span>{c.label}</span>
              </div>
            ))}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
            {loading ? 'Resetting password...' : 'Update password'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs">
          <Link to="/login" className="text-indigo-400 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
