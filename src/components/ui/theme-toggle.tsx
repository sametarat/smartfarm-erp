'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />
  const icons: Record<string, React.ReactNode> = {
    light: <Sun className="w-4 h-4" />,
    dark: <Moon className="w-4 h-4" />,
    system: <Monitor className="w-4 h-4" />,
  }
  const next: Record<string, string> = { light: 'dark', dark: 'system', system: 'light' }
  return (
    <button
      onClick={() => setTheme(next[theme || 'system'])}
      className={cn('w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors')}
      title={`Tema: ${theme}`}
    >
      {icons[theme || 'system']}
    </button>
  )
}
