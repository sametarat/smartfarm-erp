'use client'

import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { LogOut, Settings, User, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function UserMenu() {
  const { user, logout } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  const displayName = user ? `${user.name} ${user.surname}` : 'Kullanici'
  const initials = user ? `${user.name[0]}${user.surname[0]}` : 'K'
  const roleName = user?.role?.displayName || 'Misafir'

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-accent transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-green-700 flex items-center justify-center text-white text-xs font-semibold shrink-0">
          {initials}
        </div>
        <div className="hidden md:block text-left">
          <div className="text-xs font-medium">{displayName}</div>
          <div className="text-xs text-muted-foreground">{roleName}</div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-48 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <div className="text-xs font-medium">{user?.email}</div>
              <div className="text-xs text-muted-foreground">{roleName}</div>
            </div>
            <button onClick={() => { setOpen(false); router.push('/settings') }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
              <Settings className="w-4 h-4" /> Ayarlar
            </button>
            <div className="border-t border-border" />
            <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950">
              <LogOut className="w-4 h-4" /> Cikis Yap
            </button>
          </div>
        </>
      )}
    </div>
  )
}
