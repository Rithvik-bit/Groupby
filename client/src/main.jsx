import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { SocketProvider } from './context/SocketContext.jsx'
import './index.css'

// Catch any uncaught errors that happen before React mounts
window.onerror = function (msg, src, line, col, err) {
  document.body.innerHTML = `<div style="padding:32px;color:#ff6b6b;background:#121212;font-family:monospace;min-height:100vh">
    <h2 style="font-size:20px;font-weight:bold;margin-bottom:12px">⚠️ Uncaught Error (before React mounted)</h2>
    <pre style="white-space:pre-wrap;background:#1e1e1e;padding:16px;border-radius:8px;color:#fca5a5">${msg}\n${err?.stack || ''}</pre>
    <button onclick="location.reload()" style="margin-top:16px;padding:8px 16px;background:#4f46e5;color:#fff;border:none;border-radius:6px;cursor:pointer">Reload</button>
  </div>`
  return false
}
window.onunhandledrejection = function (e) {
  console.error('[UnhandledRejection]', e.reason)
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught error:', error, info)
    this.setState({ info })
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '32px', color: '#ff6b6b', background: '#121212', fontFamily: 'monospace', minHeight: '100vh' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '12px' }}>⚠️ Application Runtime Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', background: '#1e1e1e', padding: '16px', borderRadius: '8px', color: '#fca5a5' }}>
            {this.state.error?.stack || this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: '16px', padding: '8px 16px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SocketProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                style: {
                  background: '#16161f',
                  color: '#f0f0fa',
                  border: '1px solid #2a2a3a',
                  borderRadius: '0.75rem',
                  fontSize: '0.875rem',
                },
                success: { iconTheme: { primary: '#10b981', secondary: '#16161f' } },
                error: { iconTheme: { primary: '#ef4444', secondary: '#16161f' } },
              }}
            />
          </SocketProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)
