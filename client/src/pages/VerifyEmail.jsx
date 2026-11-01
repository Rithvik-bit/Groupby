import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import Logo from '../components/Logo'

export default function VerifyEmail() {
  const { token } = useParams()
  const { verifyEmail } = useAuth()
  const [status, setStatus] = useState('loading') // 'loading' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    const doVerify = async () => {
      try {
        await verifyEmail(token)
        if (isMounted) setStatus('success')
      } catch (err) {
        if (isMounted) {
          setStatus('error')
          setErrorMessage(err.response?.data?.error?.message || 'Verification token is invalid or expired.')
        }
      }
    }

    if (token) {
      doVerify()
    } else {
      setStatus('error')
      setErrorMessage('Missing verification token.')
    }

    return () => {
      isMounted = false
    }
  }, [token, verifyEmail])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 flex-col" style={{ background: 'var(--bg-primary)' }}>
      <div className="mb-6">
        <Logo variant="full" size="md" to="/" />
      </div>
      <div className="w-full max-w-md animate-fade-in card p-8 text-center">
        {status === 'loading' && (
          <div className="py-8">
            <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-500" />
            <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Verifying your email...
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Please wait while we confirm your account details.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="py-6">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-emerald-400" />
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Email verified!
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Your email has been successfully verified. You now have full access to GroupBuy.
            </p>
            <Link to="/login" className="btn-primary inline-flex justify-center">
              Continue to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="py-6">
            <XCircle className="w-14 h-14 mx-auto mb-4 text-rose-400" />
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Verification failed
            </h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              {errorMessage}
            </p>
            <Link to="/login" className="btn-secondary inline-flex justify-center">
              Return to Login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
