'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react'
import { toast } from 'sonner'

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-500/15 text-red-500',
  ADMIN:       'bg-orange-500/15 text-orange-500',
  OWNER:       'bg-purple-500/15 text-purple-500',
  VET:         'bg-blue-500/15 text-blue-500',
  AGRONOMIST:  'bg-green-500/15 text-green-500',
  TECHNICIAN:  'bg-yellow-500/15 text-yellow-500',
  GREENHOUSE:  'bg-teal-500/15 text-teal-500',
  BARN:        'bg-amber-500/15 text-amber-500',
  WAREHOUSE:   'bg-cyan-500/15 text-cyan-500',
  ACCOUNTANT:  'bg-indigo-500/15 text-indigo-500',
  GUEST:       'bg-gray-500/15 text-gray-500',
}

const emptyForm = { email: '', name: '', surname: '', password: '', roleId: '', phone: '', telegramId: '' }

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<any>(null)
  const [form, setForm] = useState(emptyForm)
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get('/users/roles').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowForm(false)
      setForm(emptyForm)
      toast.success('Kullanıcı oluşturuldu')
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Hata oluştu'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/users/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
      setForm(emptyForm)
      toast.success('Kullanıcı güncellendi')
    },
    onError: () => toast.error('Güncelleme başarısız'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Kullanıcı silindi')
    },
  })

  const handleEdit = (user: any) => {
    setEditUser(user)
    setForm({
      email: user.email, name: user.name, surname: user.surname,
      password: '', roleId: user.role?.id || '',
      phone: user.phone || '', telegramId: user.telegramId || '',
    })
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (editUser) {
      const data: any = { name: form.name, surname: form.surname, roleId: form.roleId, phone: form.phone, telegramId: form.telegramId }
      if (form.password) data.password = form.password
      updateMutation.mutate({ id: editUser.id, data })
    } else {
      if (!form.email || !form.name || !form.surname || !form.password || !form.roleId)
        return toast.error('Tüm zorunlu alanları doldurun')
      createMutation.mutate(form)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditUser(null)
    setForm(emptyForm)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Toplam {(users as any[]).length} kullanıcı
          </h2>
        </div>
        <button onClick={() => { setEditUser(null); setForm(emptyForm); setShowForm(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          <Plus className="w-4 h-4" /> Yeni Kullanıcı
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">{editUser ? 'Kullanıcı Düzenle' : 'Yeni Kullanıcı'}</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ad *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ad" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Soyad *</label>
              <input value={form.surname} onChange={e => setForm({...form, surname: e.target.value})}
                placeholder="Soyad" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email *</label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="Email" type="email" disabled={!!editUser}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background disabled:opacity-50" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefon</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="+90..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{editUser ? 'Yeni Şifre (boş bırakılabilir)' : 'Şifre *'}</label>
              <input value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                placeholder={editUser ? 'Değiştirmek için girin' : 'Min 8 karakter'}
                type="password" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rol *</label>
              <select value={form.roleId} onChange={e => setForm({...form, roleId: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="">Rol seç</option>
                {(roles as any[]).map((r: any) => (
                  <option key={r.id} value={r.id}>{r.displayName}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Telegram ID</label>
              <input value={form.telegramId} onChange={e => setForm({...form, telegramId: e.target.value})}
                placeholder="Telegram chat ID (opsiyonel)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
              {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : editUser ? 'Güncelle' : 'Oluştur'}
            </button>
            <button onClick={handleCancel}
              className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">
              İptal
            </button>
          </div>
        </div>
      )}

      {/* User List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Yükleniyor...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(users as any[]).map((user: any) => (
            <div key={user.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {user.name[0]}{user.surname[0]}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{user.name} {user.surname}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </div>
                <div className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                  user.status === 'ACTIVE' ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
                )}>
                  {user.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                <div className={cn('inline-flex text-xs px-2 py-0.5 rounded-full font-medium',
                  ROLE_COLORS[user.role?.name] || 'bg-gray-500/15 text-gray-500'
                )}>
                  {user.role?.displayName || 'Rol yok'}
                </div>
                {user.telegramId && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    📱 Telegram bağlı
                  </div>
                )}
                {user.lastLoginAt && (
                  <div className="text-xs text-muted-foreground">
                    Son giriş: {new Date(user.lastLoginAt).toLocaleDateString('tr-TR')}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 pt-2 border-t border-border">
                <button onClick={() => handleEdit(user)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg hover:bg-accent text-muted-foreground">
                  <Pencil className="w-3 h-3" /> Düzenle
                </button>
                <button onClick={() => deleteMutation.mutate(user.id)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg hover:bg-red-500/10 text-red-400">
                  <Trash2 className="w-3 h-3" /> Sil
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
