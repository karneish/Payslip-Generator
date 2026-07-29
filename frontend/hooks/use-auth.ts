import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '@/lib/axios'

function setCookie(name: string, value: string, days: number) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

function removeCookie(name: string) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthState {
  user: User | null
  token: string | null
  isLoading: boolean
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>
  logout: () => Promise<void>
  getMe: () => Promise<void>
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email: string, password: string, rememberMe = false) => {
        set({ isLoading: true })
        try {
          const response = await api.post('/auth/login', { email, password })
          const { token, admin } = response.data

          if (!token || !admin) {
            throw new Error('Invalid server response')
          }

          const days = rememberMe ? 30 : 1
          setCookie('auth-token', token, days)
          set({ user: admin, token })
        } catch (error: any) {
          if (error.response?.status === 401) {
            const msg = error.response?.data?.message || 'Invalid email or password'
            throw new Error(msg)
          }
          if (error.message === 'Invalid server response') {
            throw new Error('Server returned an invalid response. Please try again.')
          }
          if (!error.response) {
            throw new Error('Unable to connect to the server. Please check if the backend is running.')
          }
          const msg = error.response?.data?.message || 'Login failed. Please try again.'
          throw new Error(msg)
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout')
        } catch {
          // ignore logout errors
        } finally {
          removeCookie('auth-token')
          set({ user: null, token: null })
        }
      },

      getMe: async () => {
        try {
          const response = await api.get('/auth/me')
          set({ user: response.data.admin })
        } catch {
          removeCookie('auth-token')
          set({ user: null, token: null })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, token: state.token }),
    }
  )
)
