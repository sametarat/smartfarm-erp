import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
  surname: string
  avatar?: string
  twoFAEnabled: boolean
  role: {
    id: string
    name: string
    displayName: string
    permissions: { module: string; action: string; resource: string }[]
  }
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  setAuth: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
  hasPermission: (module: string, action: string) => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken, refreshToken) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    document.cookie = `accessToken=${accessToken}; path=/; max-age=604800`
  }
  set({ user, accessToken, refreshToken, isAuthenticated: true })
},
      logout: () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    document.cookie = 'accessToken=; path=/; max-age=0'
  }
  set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false })
},
      hasPermission: (module, action) => {
        const { user } = get()
        if (!user) return false
        if (user.role.name === 'SUPER_ADMIN') return true
        return user.role.permissions.some(
          p => p.module === module && (p.action === action || p.action === 'manage')
        )
      },
    }),
    {
      name: 'smartfarm-auth',
      partialize: state => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
