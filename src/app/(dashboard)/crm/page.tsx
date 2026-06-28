'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Plus, Phone, Mail, MapPin, Pencil, Trash2, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'

const CONTACT_TYPES = [
  { value: 'CUSTOMER',   label: '🛒 Müşteri',    color: 'bg-blue-500/15 text-blue-600' },
  { value: 'SUPPLIER',   label: '📦 Tedarikçi',  color: 'bg-orange-500/15 text-orange-600' },
  { value: 'VETERINARY', label: '💉 Veteriner',  color: 'bg-red-500/15 text-red-600' },
  { value: 'PARTNER',    label: '🤝 Ortak',      color: 'bg-purple-500/15 text-purple-600' },
  { value: 'GOVERNMENT', label: '🏛️ Resmi',      color: 'bg-gray-500/15 text-gray-600' },
  { value: 'OTHER',      label: '📋 Diğer',      color: 'bg-gray-500/15 text-gray-500' },
]

const getType = (value: string) => CONTACT_TYPES.find(t => t.value === value) || CONTACT_TYPES[5]

const emptyForm = { type: 'CUSTOMER', name: '', company: '', phone: '', email: '', address: '', taxNo: '', notes: '' }

// Varsayılan kişiler (sistemde yoksa göster)
const DEFAULT_CONTACTS = [
  { id: 'd1', type: 'VETERINARY', name: 'Ahmet YILMAZ', company: 'Veteriner Kliniği', phone: '+90 532 111 22 33', email: '', address: 'İzmit', notes: 'Küçükbaş uzmanı', tags: [], isDefault: true },
  { id: 'd2', type: 'SUPPLIER',   name: 'Özdemir Yem Sanayi', company: 'Özdemir A.Ş.', phone: '+90 224 888 99 00', email: '', address: 'Bursa', notes: 'Rasyon hammadde', tags: [], isDefault: true },
  { id: 'd3', type: 'SUPPLIER',   name: 'Elif KAYA', company: 'Ziraat Danışmanlık', phone: '+90 544 444 55 66', email: '', address: 'Kocaeli', notes: 'Sera kimya danışmanı', tags: [], isDefault: true },
]

export default function CrmPage() {
  const [typeFilter, setTypeFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editContact, setEditContact] = useState<any>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [noteText, setNoteText] = useState('')
  const queryClient = useQueryClient()

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts', typeFilter, search],
    queryFn: () => api.get('/crm/contacts', {
      params: { type: typeFilter || undefined, search: search || undefined }
    }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/crm/contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setShowForm(false); setForm(emptyForm)
      toast.success('Kişi eklendi')
    },
    onError: () => toast.error('Hata oluştu'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.put(`/crm/contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setEditContact(null); setShowForm(false); setForm(emptyForm)
      toast.success('Kişi güncellendi')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/crm/contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      toast.success('Kişi silindi')
    },
  })

  const noteMutation = useMutation({
    mutationFn: ({ id, content }: any) => api.post(`/crm/contacts/${id}/notes`, { content }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      setNoteText('')
      toast.success('Not eklendi')
    },
  })

  const handleEdit = (contact: any) => {
    setEditContact(contact)
    setForm({
      type: contact.type, name: contact.name, company: contact.company || '',
      phone: contact.phone || '', email: contact.email || '',
      address: contact.address || '', taxNo: contact.taxNo || '', notes: contact.notes || '',
    })
    setShowForm(true)
  }

  const handleSubmit = () => {
    if (!form.name) return toast.error('Ad zorunludur')
    if (editContact) {
      updateMutation.mutate({ id: editContact.id, data: form })
    } else {
      createMutation.mutate(form)
    }
  }

  // API'den gelen + varsayılan kişileri birleştir
  const allContacts = [
    ...(contacts as any[]),
    ...DEFAULT_CONTACTS.filter(d => !(contacts as any[]).some((c: any) => c.phone === d.phone)),
  ]
  const filteredContacts = allContacts.filter(c => {
    if (typeFilter && c.type !== typeFilter) return false
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) &&
        !(c.company || '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* İstatistikler */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {CONTACT_TYPES.map(t => {
          const count = allContacts.filter(c => c.type === t.value).length
          return (
            <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
              className={cn('bg-card border rounded-xl p-2 text-center transition-all',
                typeFilter === t.value ? 'border-green-500 ring-1 ring-green-500' : 'border-border hover:border-green-500/50'
              )}>
              <div className="text-lg font-bold">{count}</div>
              <div className="text-xs text-muted-foreground">{t.label.split(' ')[1]}</div>
            </button>
          )
        })}
      </div>

      {/* Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="İsim veya şirket ara..."
          className="flex-1 min-w-48 px-3 py-2 text-sm rounded-lg border border-border bg-background" />
        <button onClick={() => { setEditContact(null); setForm(emptyForm); setShowForm(!showForm) }}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          <Plus className="w-4 h-4" /> Kişi Ekle
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">{editContact ? 'Kişi Düzenle' : 'Yeni Kişi'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tür</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                {CONTACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ad Soyad *</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
                placeholder="Ad Soyad" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Firma</label>
              <input value={form.company} onChange={e => setForm({...form, company: e.target.value})}
                placeholder="Firma adı" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Telefon</label>
              <input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})}
                placeholder="+90..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Email</label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                placeholder="email@..." type="email" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Vergi No</label>
              <input value={form.taxNo} onChange={e => setForm({...form, taxNo: e.target.value})}
                placeholder="Vergi No" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Adres</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                placeholder="Adres" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div className="col-span-2 md:col-span-3">
              <label className="text-xs text-muted-foreground mb-1 block">Not</label>
              <input value={form.notes} onChange={e => setForm({...form, notes: e.target.value})}
                placeholder="Not" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
              {createMutation.isPending || updateMutation.isPending ? 'Kaydediliyor...' : editContact ? 'Güncelle' : 'Kaydet'}
            </button>
            <button onClick={() => { setShowForm(false); setEditContact(null); setForm(emptyForm) }}
              className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">İptal</button>
          </div>
        </div>
      )}

      {/* Kişi Listesi */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Yükleniyor...</div>
      ) : filteredContacts.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <div className="text-4xl mb-2">👤</div>
          <p className="text-sm">Kişi bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredContacts.map((contact: any) => {
            const typeInfo = getType(contact.type)
            return (
              <div key={contact.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === contact.id ? null : contact.id)}>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {contact.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{contact.name}</span>
                      {contact.company && <span className="text-xs text-muted-foreground">{contact.company}</span>}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', typeInfo.color)}>
                        {typeInfo.label}
                      </span>
                      {contact.isDefault && <span className="text-xs text-muted-foreground">(Varsayılan)</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{contact.phone}</span>}
                      {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{contact.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {!contact.isDefault && (
                      <>
                        <button onClick={e => { e.stopPropagation(); handleEdit(contact) }}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(contact.id) }}
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    {expanded === contact.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expanded === contact.id && (
                  <div className="border-t border-border p-4 space-y-3">
                    {/* Detaylar */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {contact.address && (
                        <div className="flex items-start gap-1.5 col-span-2">
                          <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{contact.address}</span>
                        </div>
                      )}
                      {contact.taxNo && <div><span className="text-muted-foreground">VKN:</span> {contact.taxNo}</div>}
                      {contact.notes && <div className="col-span-2"><span className="text-muted-foreground">Not:</span> {contact.notes}</div>}
                    </div>

                    {/* Hızlı iletişim */}
                    <div className="flex gap-2">
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-600 text-xs rounded-lg hover:bg-green-500/20">
                          <Phone className="w-3 h-3" /> Ara
                        </a>
                      )}
                      {contact.email && (
                        <a href={`mailto:${contact.email}`}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-600 text-xs rounded-lg hover:bg-blue-500/20">
                          <Mail className="w-3 h-3" /> Mail
                        </a>
                      )}
                    </div>

                    {/* İşlem geçmişi */}
                    {contact.transactions?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">Son İşlemler</div>
                        <div className="space-y-1">
                          {contact.transactions.map((t: any) => (
                            <div key={t.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded-lg">
                              <span>{t.description || t.type}</span>
                              <span className={cn('font-semibold', t.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                                {t.type === 'INCOME' ? '+' : '-'}{Number(t.amount).toLocaleString('tr-TR')} ₺
                              </span>
                              <span className="text-muted-foreground">{new Date(t.date).toLocaleDateString('tr-TR')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notlar */}
                    {!contact.isDefault && (
                      <div>
                        {contact.notes_rel?.length > 0 && (
                          <div className="space-y-1 mb-2">
                            {contact.notes_rel.map((n: any) => (
                              <div key={n.id} className="text-xs p-2 bg-muted rounded-lg">
                                <div>{n.content}</div>
                                <div className="text-muted-foreground mt-0.5">{new Date(n.createdAt).toLocaleDateString('tr-TR')}</div>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="flex gap-2">
                          <input value={noteText} onChange={e => setNoteText(e.target.value)}
                            placeholder="Not ekle..."
                            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-border bg-background" />
                          <button onClick={() => noteText && noteMutation.mutate({ id: contact.id, content: noteText })}
                            disabled={!noteText || noteMutation.isPending}
                            className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg disabled:opacity-50 flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" /> Ekle
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
