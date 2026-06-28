'use client'

import { Bell } from 'lucide-react'
import { useState } from 'react'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const count = 2

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-accent text-muted-foreground">
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {count}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-72 bg-popover border border-border rounded-lg shadow-lg z-20 overflow-hidden">
            <div className="px-3 py-2 border-b border-border flex items-center justify-between">
              <span className="text-sm font-semibold">Bildirimler</span>
              <span className="text-xs text-muted-foreground">{count} okunmamis</span>
            </div>
            <div className="divide-y divide-border">
              <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-accent cursor-pointer">
                <span className="text-base shrink-0">⚠️</span>
                <div>
                  <div className="text-xs">Sera pH yuksek (6.5)</div>
                  <div className="text-xs text-muted-foreground">5dk once</div>
                </div>
              </div>
              <div className="flex items-start gap-2 px-3 py-2.5 hover:bg-accent cursor-pointer">
                <span className="text-base shrink-0">✅</span>
                <div>
                  <div className="text-xs">Sulama tamamlandi (08:00)</div>
                  <div className="text-xs text-muted-foreground">2sa once</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
