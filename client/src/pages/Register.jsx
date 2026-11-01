import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Eye, EyeOff, UserPlus, AlertCircle, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import Logo from '../components/Logo'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '', displayName: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const passwordChecks = [
    { label: 'At least 8 characters', ok: form.password.length >= 8 },
    { label: 'Contains uppercase letter', ok: /[A-Z]/.test(form.password) },
    { label: 'Contains a number', ok: /[0-9]/.test(form.password) },
  ]

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!passwordChecks.every(c => c.ok)) {
      setError('Password does not meet requirements.')
      return
    }
    setLoading(true)
    try {
      await register(form)
      toast.success('Account created! Check your email to verify.')
      navigate('/login')
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.message ||
        (err.message === 'Network Error'
          ? 'Cannot connect to backend server. Please make sure the backend is running.'
          : err.message || 'Registration failed.')
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md animate-fade-in">
        {/* Brand Logo & Header */}
        <div className="mb-8 text-center flex flex-col items-center">
          <Logo variant="full" size="md" to="/" className="mb-4" />
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Welcome to GroupBuy</h1>
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Buy Together. Own Together.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label htmlFor="reg-display-name" className="label">Display Name</label>
            <input id="reg-display-name" type="text" className="input" placeholder="Your Name"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label htmlFor="reg-email" className="label">Email</label>
              <input id="reg-email" type="email" className="input" placeholder="you@example.com"
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-username" className="label">Username</label>
              <input id="reg-username" type="text" className="input" placeholder="username"
                value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
                required minLength={3} maxLength={30} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-password" className="label">Password</label>
            <div className="relative">
              <input id="reg-password" type={showPass ? 'text' : 'password'} className="input pr-10"
                placeholder="••••••••" value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setShowPass(!showPass)} style={{ color: 'var(--text-secondary)' }}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {form.password && (
              <div className="mt-2 space-y-1">
                {passwordChecks.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs"
                    style={{ color: c.ok ? '#10b981' : 'var(--text-secondary)' }}>
                    <Check size={12} />
                    {c.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" id="register-submit" className="btn-primary w-full justify-center py-3" disabled={loading}>
            {loading
              ? <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              : <span className="flex items-center gap-2 justify-center"><UserPlus size={16} /> Create Account</span>
            }
          </button>
        </form>

        <p className="text-center mt-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--accent-primary)' }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
