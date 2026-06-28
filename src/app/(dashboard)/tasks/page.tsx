'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Plus, CheckSquare, Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const PRIORITY_COLOR: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-500 border-red-500/30',
  HIGH:     'bg-orange-500/15 text-orange-500 border-orange-500/30',
  MEDIUM:   'bg-blue-500/15 text-blue-500 border-blue-500/30',
  LOW:      'bg-gray-500/15 text-gray-500 border-gray-500/30',
}

const PRIORITY_TR: Record<string, string> = {
  CRITICAL: 'Kritik', HIGH: 'Yüksek', MEDIUM: 'Orta', LOW: 'Düşük'
}

const STATUS_TR: Record<string, string> = {
  PENDING: 'Bekliyor', IN_PROGRESS: 'Devam Ediyor', COMPLETED: 'Tamamlandı'
}

const TASK_TYPES = [
  { value: 'GENERAL', label: 'Genel' },
  { value: 'IRRIGATION', label: 'Sulama' },
  { value: 'FERTILIZATION', label: 'Gübreleme' },
  { value: 'HARVESTING', label: 'Hasat' },
  { value: 'MAINTENANCE', label: 'Bakım' },
  { value: 'VETERINARY', label: 'Veteriner' },
  { value: 'FEEDING', label: 'Yem' },
  { value: 'INSPECTION', label: 'Kontrol' },
  { value: 'CLEANING', label: 'Temizlik' },
]

export default function TasksPage() {
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState('PENDING')
 const [form, setForm] = useState({
  title: '', description: '', priority: 'MEDIUM',
  type: 'GENERAL', dueDate: '', dueTime: '', assigneeId: ''
})
  const queryClient = useQueryClient()

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => api.get(`/tasks?status=${filter}`).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: usersData } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.get('/tasks/users-list').then(r => r.data),
})
const users = Array.isArray(usersData) ? usersData : []

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/tasks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setShowForm(false)
      setForm({ title: '', description: '', priority: 'MEDIUM', type: 'GENERAL', dueDate: '', assigneeId: '' })
      toast.success('Görev oluşturuldu')
    },
    onError: () => toast.error('Görev oluşturulamadı'),
  })

  const completeMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`, {}),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Görev tamamlandı') },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Görev silindi') },
  })

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {['PENDING', 'IN_PROGRESS', 'COMPLETED'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                filter === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}>
              {STATUS_TR[s]}
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          <Plus className="w-4 h-4" /> Yeni Görev
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Yeni Görev Oluştur</h3>
          <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
            placeholder="Görev başlığı *" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
            placeholder="Açıklama" rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tür</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Öncelik</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="LOW">Düşük</option>
                <option value="MEDIUM">Orta</option>
                <option value="HIGH">Yüksek</option>
                <option value="CRITICAL">Kritik</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Atanan Kişi</label>
              <select value={form.assigneeId} onChange={e => setForm({...form, assigneeId: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="">Seç</option>
                {(users as any[]).map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name} {u.surname}</option>
                ))}
              </select>
            </div>
           <div>
  <label className="text-xs text-muted-foreground mb-1 block">Son Tarih & Saat</label>
  <div className="flex gap-1">
    <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
      className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background" />
    <input type="time" value={form.dueTime} onChange={e => setForm({...form, dueTime: e.target.value})}
      className="w-24 px-3 py-2 text-sm rounded-lg border border-border bg-background" />
  </div>
</div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate({
  ...form,
  dueDate: form.dueDate && form.dueTime
    ? `${form.dueDate}T${form.dueTime}:00`
    : form.dueDate || undefined,
})}
              disabled={!form.title || createMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
              {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Task List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Yükleniyor...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Görev bulunamadı</p>
          <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-green-600 hover:underline">
            Yeni görev oluştur
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {(tasks as any[]).map((task: any) => (
            <div key={task.id} className="bg-card border border-border rounded-xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', PRIORITY_COLOR[task.priority])}>
                    {PRIORITY_TR[task.priority]}
                  </span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {TASK_TYPES.find(t => t.value === task.type)?.label || task.type}
                  </span>
                  {task.dueDate && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(task.dueDate).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium">{task.title}</div>
                {task.description && <div className="text-xs text-muted-foreground mt-0.5">{task.description}</div>}
                {task.assignee && (
                  <div className="text-xs text-muted-foreground mt-1">
                    👤 {task.assignee.name} {task.assignee.surname}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {filter !== 'COMPLETED' && (
                  <button onClick={() => completeMutation.mutate(task.id)}
                    className="p-1.5 rounded-lg hover:bg-green-500/10 text-green-500" title="Tamamla">
                    <CheckSquare className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => deleteMutation.mutate(task.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400" title="Sil">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
