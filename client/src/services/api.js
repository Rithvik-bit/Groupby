import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // send/receive HttpOnly cookies
  timeout: 15000,
})

// In-memory access token storage (never written to localStorage or sessionStorage)
let inMemoryAccessToken = null

export function setAuthToken(token) {
  inMemoryAccessToken = token || null
}

export function getAuthToken() {
  return inMemoryAccessToken
}

function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp('(^|;\\s*)gb_csrf=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

// Inject in-memory access token & CSRF header on every request
api.interceptors.request.use((config) => {
  if (inMemoryAccessToken && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${inMemoryAccessToken}`
  }

  const csrfToken = getCsrfTokenFromCookie()
  if (csrfToken && !config.headers['X-CSRF-Token']) {
    config.headers['X-CSRF-Token'] = csrfToken
  }

  return config
})

// Handle 401 — attempt automatic token refresh without infinite loops
let isRefreshing = false
let refreshSubscribers = []

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb)
}

function onRefreshed(token) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    // Only attempt refresh for 401s on non-auth routes that haven't been retried
    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes('/auth/login') &&
      !original.url?.includes('/auth/register') &&
      !original.url?.includes('/auth/refresh')
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((token) => {
            if (!token) return reject(error)
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      isRefreshing = true

      try {
        const res = await api.post('/auth/refresh')
        const newToken = res.data.data.accessToken
        setAuthToken(newToken)
        onRefreshed(newToken)
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshErr) {
        setAuthToken(null)
        onRefreshed(null)
        return Promise.reject(refreshErr)
      } finally {
        isRefreshing = false
      }
    }
    return Promise.reject(error)
  }
)

export default api
