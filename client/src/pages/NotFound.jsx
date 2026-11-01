import { Link } from 'react-router-dom'
import Logo from '../components/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center text-center p-6"
      style={{ background: 'var(--bg-primary)' }}>
      <div className="animate-fade-in flex flex-col items-center">
        <Logo variant="full" size="md" to="/" className="mb-6" />
        <div className="text-8xl font-black mb-4"
          style={{ background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          404
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Page not found</h1>
        <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
          The page you're looking for doesn't exist or you don't have access to it.
        </p>
        <Link to="/dashboard" className="btn-primary">Go to Dashboard</Link>
      </div>
    </div>
  )
}
