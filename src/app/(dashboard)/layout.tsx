'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth.store'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { UserMenu } from '@/components/layout/user-menu'
import { NotificationBell } from '@/components/layout/notification-bell'
import {
  LayoutDashboard, Sprout, PawPrint, CheckSquare, Users,
  Package, DollarSign, FileText, Settings, Cpu, Menu, X,
  Zap, BookOpen, Calendar
} from 'lucide-react'

const ROUTE_ROLES: Record<string, string[]> = {
  '/scada':           ['SUPER_ADMIN', 'OWNER', 'TECHNICIAN'],
  '/farm':            ['SUPER_ADMIN', 'OWNER', 'TECHNICIAN'],
  '/animals':         ['SUPER_ADMIN', 'OWNER', 'BARN'],
  '/crm':             ['SUPER_ADMIN', 'OWNER'],
  '/finance':         ['SUPER_ADMIN', 'OWNER'],
  '/settings/users':  ['SUPER_ADMIN', 'OWNER'],
  '/settings':        ['SUPER_ADMIN', 'OWNER'],
  '/reports':         ['SUPER_ADMIN', 'OWNER'],
}

const NAV_ITEMS = [
  {
    label: 'Ana Menü',
    items: [
      { href: '/dashboard',       icon: LayoutDashboard, label: 'Dashboard',        badge: null,   roles: [] },
      { href: '/scada',           icon: Cpu,             label: 'SCADA / IoT',      badge: 'live', roles: ['SUPER_ADMIN','OWNER','TECHNICIAN'] },
    ]
  },
  {
    label: 'Üretim',
    items: [
      { href: '/farm',            icon: Sprout,          label: 'Tarım',            badge: null, roles: ['SUPER_ADMIN','OWNER','TECHNICIAN'] },
      { href: '/animals',         icon: PawPrint,        label: 'Hayvancılık',      badge: null, roles: ['SUPER_ADMIN','OWNER','BARN'] },
      { href: '/calendar',        icon: Calendar,        label: 'Ekim Takvimi',     badge: null, roles: [] },
    ]
  },
  {
    label: 'Yönetim',
    items: [
      { href: '/tasks',           icon: CheckSquare,     label: 'Görevler',         badge: null, roles: [] },
      { href: '/crm',             icon: Users,           label: 'CRM',              badge: null, roles: ['SUPER_ADMIN','OWNER'] },
      { href: '/stock',           icon: Package,         label: 'Stok',             badge: null, roles: [] },
      { href: '/finance',         icon: DollarSign,      label: 'Finans',           badge: null, roles: ['SUPER_ADMIN','OWNER'] },
    ]
  },
  {
    label: 'Raporlar & Ayarlar',
    items: [
      { href: '/reports',         icon: FileText,        label: 'Raporlar',         badge: null, roles: ['SUPER_ADMIN','OWNER'] },
      { href: '/settings/staff',  icon: BookOpen,        label: 'Personel Rehberi', badge: null, roles: [] },
      { href: '/settings/users',  icon: Users,           label: 'Kullanıcılar',     badge: null, roles: ['SUPER_ADMIN','OWNER'] },
      { href: '/settings',        icon: Settings,        label: 'Ayarlar',          badge: null, roles: ['SUPER_ADMIN','OWNER'] },
    ]
  },
]

function Sidebar({ isOpen, onClose, userRole }: { isOpen: boolean; onClose: () => void; userRole: string }) {
  const pathname = usePathname()

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 flex flex-col w-64',
        'bg-[hsl(var(--sidebar-background))] border-r border-[hsl(var(--sidebar-border))]',
        'transition-transform duration-300 ease-in-out',
        'lg:translate-x-0 lg:static lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between px-4 h-16 border-b border-[hsl(var(--sidebar-border))]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">SmartFarm</div>
              <div className="text-xs text-muted-foreground">ERP v1.0</div>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 rounded hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {NAV_ITEMS.map((group) => {
            const visibleItems = group.items.filter(item =>
              !item.roles?.length || item.roles.includes(userRole)
            )
            if (!visibleItems.length) return null
            return (
              <div key={group.label} className="mb-4">
                <div className="px-3 mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </div>
                <ul className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                    return (
                      <li key={item.href}>
                        <Link href={item.href} onClick={onClose}
                          className={cn(
                            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150',
                            isActive
                              ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-accent-foreground))] font-medium'
                              : 'text-[hsl(var(--sidebar-foreground))] hover:bg-[hsl(var(--sidebar-accent))]'
                          )}>
                          <item.icon className={cn('w-4 h-4 shrink-0', isActive && 'text-green-700')} />
                          <span className="flex-1">{item.label}</span>
                          {item.badge === 'live' && (
                            <span className="flex items-center gap-1 text-xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                              <span className="text-green-500">Canlı</span>
                            </span>
                          )}
                          {item.badge && item.badge !== 'live' && (
                            <span className="min-w-5 h-5 px-1.5 text-xs font-medium bg-green-700 text-white rounded-full flex items-center justify-center">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-[hsl(var(--sidebar-border))]">
          <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-green-500/10 text-green-600 text-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span>Sistem Normal</span>
            <Zap className="w-3 h-3 ml-auto" />
          </div>
        </div>
      </aside>
    </>
  )
}

function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname()
  const pageTitle = NAV_ITEMS
    .flatMap(g => g.items)
    .find(i => pathname === i.href || pathname.startsWith(i.href + '/'))?.label || 'Dashboard'

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur sticky top-0 z-30 flex items-center px-4 gap-4">
      <button onClick={onMenuClick} className="lg:hidden p-2 rounded-lg hover:bg-accent">
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1">
        <h1 className="text-base font-semibold text-foreground">{pageTitle}</h1>
      </div>
      <div className="flex items-center gap-2">
        <NotificationBell />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isAuthenticated, user } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isAuthenticated) router.push('/login')
  }, [isAuthenticated])

  const userRole = user?.role?.name || ''

  const allowedRoles = Object.entries(ROUTE_ROLES).find(([route]) => pathname.startsWith(route))?.[1]
  if (allowedRoles && userRole && !allowedRoles.includes(userRole)) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center">
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-lg font-semibold">Erişim Yetkiniz Yok</h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">Bu sayfaya erişim izniniz bulunmuyor.</p>
          <button onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
            Dashboard'a Dön
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
