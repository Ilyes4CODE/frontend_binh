import axios from 'axios'

const ACCESS_KEY = 'bdg_access_token'
const REFRESH_KEY = 'bdg_refresh_token'

export const tokenStorage = {
  getAccess: () => localStorage.getItem(ACCESS_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  set: (access: string, refresh: string) => {
    localStorage.setItem(ACCESS_KEY, access)
    localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear: () => {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/**
 * Where the API lives.
 *
 * In development this stays '/api' and Vite proxies it to the Django server.
 * In production the API is usually on its own subdomain, so the URL is baked
 * in at build time from VITE_API_BASE_URL (see .env.example).
 */
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

export const api = axios.create({ baseURL: API_BASE })

api.interceptors.request.use((config) => {
  const token = tokenStorage.getAccess()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) return null
  try {
    const { data } = await axios.post('/api/auth/token/refresh/', { refresh })
    tokenStorage.set(data.access, refresh)
    return data.access as string
  } catch {
    tokenStorage.clear()
    return null
  }
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry && tokenStorage.getRefresh()) {
      original._retry = true
      refreshPromise ??= refreshAccessToken()
      const newToken = await refreshPromise
      refreshPromise = null
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      }
    }
    return Promise.reject(error)
  },
)
