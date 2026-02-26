// CounselAI – API Client
// Axios instance with JWT refresh token rotation

import axios, { AxiosInstance } from 'axios'
import toast from 'react-hot-toast'
import type {
  ContractDetail, ContractAnalysis, DashboardStats,
  TokenResponse, User, Contract,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── Auth token store ─────────────────────────────────────────────────────────

let accessToken: string | null = localStorage.getItem('access_token')
let refreshToken: string | null = localStorage.getItem('refresh_token')
let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function setTokens(access: string, refresh: string) {
  accessToken  = access
  refreshToken = refresh
  localStorage.setItem('access_token', access)
  localStorage.setItem('refresh_token', refresh)
}

function clearTokens() {
  accessToken  = null
  refreshToken = null
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

function onRefreshed(token: string) {
  refreshSubscribers.forEach(cb => cb(token))
  refreshSubscribers = []
}

// ── Axios instance ────────────────────────────────────────────────────────────

const api: AxiosInstance = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 30_000,
  headers: { 'Content-Type': 'application/json' },
})

// Request: attach Bearer token
api.interceptors.request.use(config => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

// Response: handle 401 with token rotation
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config

    if (err.response?.status === 401 && !original._retry && refreshToken) {
      if (isRefreshing) {
        return new Promise(resolve => {
          refreshSubscribers.push(token => {
            original.headers.Authorization = `Bearer ${token}`
            resolve(api(original))
          })
        })
      }

      original._retry = true
      isRefreshing     = true

      try {
        const { data } = await axios.post<TokenResponse>(
          `${BASE_URL}/api/v1/auth/refresh`,
          { refresh_token: refreshToken },
        )
        setTokens(data.access_token, data.refresh_token)
        onRefreshed(data.access_token)
        original.headers.Authorization = `Bearer ${data.access_token}`
        return api(original)
      } catch {
        clearTokens()
        window.location.href = '/login'
      } finally {
        isRefreshing = false
      }
    }

    const msg = err.response?.data?.detail || 'Something went wrong'
    if (err.response?.status !== 401) {
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg))
    }
    return Promise.reject(err)
  },
)

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: async (email: string, fullName: string, password: string) => {
    const { data } = await api.post<TokenResponse>('/auth/register', {
      email, full_name: fullName, password,
    })
    setTokens(data.access_token, data.refresh_token)
    return data
  },

  login: async (email: string, password: string) => {
    const { data } = await api.post<TokenResponse>('/auth/login', { email, password })
    setTokens(data.access_token, data.refresh_token)
    return data
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    clearTokens()
  },

  me: async (): Promise<User> => {
    const { data } = await api.get<User>('/auth/me')
    return data
  },
}

// ── Contracts ─────────────────────────────────────────────────────────────────

export const contractsApi = {
  upload: async (file: File, onProgress?: (pct: number) => void): Promise<Contract> => {
    const form = new FormData()
    form.append('file', file)
    const { data } = await api.post<Contract>('/contracts/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: e => {
        if (onProgress && e.total) onProgress(Math.round(e.loaded / e.total * 100))
      },
    })
    return data
  },

  list: async (skip = 0, limit = 20): Promise<Contract[]> => {
    const { data } = await api.get<Contract[]>('/contracts/', { params: { skip, limit } })
    return data
  },

  get: async (id: string): Promise<ContractDetail> => {
    const { data } = await api.get<ContractDetail>(`/contracts/${id}`)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/contracts/${id}`)
  },

  reanalyze: async (id: string): Promise<Contract> => {
    const { data } = await api.post<Contract>(`/contracts/${id}/reanalyze`)
    return data
  },

  stats: async (): Promise<DashboardStats> => {
    const { data } = await api.get<DashboardStats>('/contracts/stats')
    return data
  },
}

export { setTokens, clearTokens }
export default api
