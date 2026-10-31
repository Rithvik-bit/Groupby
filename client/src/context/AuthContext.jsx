import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api, { setAuthToken } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessTokenState] = useState(null)
  const [loading, setLoading] = useState(true)

  const updateToken = useCallback((token) => {
    setAccessTokenState(token || null)
    setAuthToken(token || null)
  }, [])

  // Attempt initial session restoration via HttpOnly refresh cookie
  useEffect(() => {
    let isMounted = true

    const tryRefresh = async () => {
      try {
        const res = await api.post('/auth/refresh')
        const token = res.data.data?.accessToken
        if (isMounted && token) {
          updateToken(token)
          const meRes = await api.get('/auth/me')
          if (isMounted) {
            setUser(meRes.data.data)
          }
        }
      } catch {
        if (isMounted) {
          setUser(null)
          updateToken(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    tryRefresh()
    return () => {
      isMounted = false
    }
  }, [updateToken])

  const login = useCallback(async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { accessToken: token, user: userData } = res.data.data
    updateToken(token)
    setUser(userData)
    return userData
  }, [updateToken])

  const register = useCallback(async (data) => {
    const res = await api.post('/auth/register', data)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } catch {
      // Swallow error during logout
    }
    setUser(null)
    updateToken(null)
  }, [updateToken])

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword })
    setUser(null)
    updateToken(null)
    return res.data
  }, [updateToken])

  const forgotPassword = useCallback(async (email) => {
    const res = await api.post('/auth/forgot-password', { email })
    return res.data
  }, [])

  const resetPassword = useCallback(async (token, password) => {
    const res = await api.post(`/auth/reset-password/${token}`, { password })
    return res.data
  }, [])

  const verifyEmail = useCallback(async (token) => {
    const res = await api.get(`/auth/verify-email/${token}`)
    return res.data
  }, [])

  const updateProfile = useCallback(async (updates) => {
    const res = await api.patch('/auth/me', updates)
    setUser(res.data.data)
    return res.data.data
  }, [])

  const deactivateAccount = useCallback(async () => {
    const res = await api.post('/auth/deactivate')
    setUser(null)
    updateToken(null)
    return res.data
  }, [updateToken])

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        loading,
        login,
        register,
        logout,
        changePassword,
        forgotPassword,
        resetPassword,
        verifyEmail,
        updateProfile,
        deactivateAccount,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
