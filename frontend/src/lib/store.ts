// CounselAI – Auth State (Zustand)
import { create } from 'zustand'
import { authApi } from '../lib/api'
import type { User } from '../types'

interface AuthState {
  user:       User | null
  loading:    boolean
  setUser:    (u: User | null) => void
  fetchMe:    () => Promise<void>
  logout:     () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  loading: false,

  setUser: (user) => set({ user }),

  fetchMe: async () => {
    try {
      set({ loading: true })
      const user = await authApi.me()
      set({ user })
    } catch {
      set({ user: null })
    } finally {
      set({ loading: false })
    }
  },

  logout: async () => {
    await authApi.logout()
    set({ user: null })
    window.location.href = '/login'
  },
}))
