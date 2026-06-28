'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Plus, Trash2, ChevronDown, ChevronUp, Droplets, Sprout, Package } from 'lucide-react'
import { toast } from 'sonner'

const STATUS_COLOR: Record<string, string> = {
  PLANNED:   'bg-blue-500/15 text-blue-600',
  GROWING:   'bg-green-500/15 text-green-600',
  HARVESTED: 'bg-yellow-500/15 text-yellow-600',
  FAILED:    'bg-red-500/15 text-red-500',
  CANCELLED: 'bg-gray-500/15 text-gray-500',
}

const STATUS_TR: Record<string, string> = {
  PLANNED: 'Planlandı', GROWING: 'Büyüyor',
  HARVESTED: 'Hasat Edildi', FAILED: 'Başarısız', CANCELLED: 'İptal'
}

const ZONE_TYPE_TR: Record<string, string> = {
  GREENHOUSE: '🌿 Sera', FIELD: '🌾 Tarla', BARN: '🐑 Ahır',
  STORAGE: '🏠 Depo', OFFICE: '🏢 Ofis', OTHER: '📍 Diğer'
}

const CROP_NAMES = ['Çilek', 'Marul', 'Fesleğen', 'Domates', 'Biber', 'Salatalık', 'Mantar', 'Maralfalfa']

export default function FarmPage() {
  const [activeTab, setActiveTab] = useState<'zones' | 'crops'>('crops')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cropTab, setCropTab] = useState<Record<string, string>>({})
  const [showCropForm, setShowCropForm] = useState(false)
  const [showZoneForm, setShowZoneForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [cropForm, setCropForm] = useState({ name: '', variety: '', zoneId: '', plantDate: '', expectedHarvest: '', area: '', status: 'GROWING', notes: '' })
  const [zoneForm, setZoneForm] = useState({ name: '', type: 'GREENHOUSE', description: '', area: '' })
  const [harvestForm, setHarvestForm] = useState({ quantity: '', unit: 'kg', quality: '', price: '', notes: '' })
  const [irrigForm, setIrrigForm] = useState({ amount: '', unit: 'litre', duration: '', ph: '', ec: '', notes: '' })
  const [fertForm, setFertForm] = useState({ fertilizerName: '', amount: '', unit: 'ml', notes: '' })
  const queryClient = useQueryClient()

  const { data: crops = [], isLoading: cropsLoading } = useQuery({
    queryKey: ['crops', statusFilter],
    queryFn: () => api.get(`/farm/crops${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: () => api.get('/farm/zones').then(r => r.data),
  })

  const { data: stats } = useQuery({
    queryKey: ['crop-stats'],
    queryFn: () => api.get('/farm/crops/stats').then(r => r.data),
  })

  const createCropMutation = useMutation({
    mutationFn: (data: any) => api.post('/farm/crops', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] })
      queryClient.invalidateQueries({ queryKey: ['crop-stats'] })
      setShowCropForm(false)
      setCropForm({ name: '', variety: '', zoneId: '', plantDate: '', expectedHarvest: '', area: '', status: 'GROWING', notes: '' })
      toast.success('Ürün eklendi')
    },
  })

  const createZoneMutation = useMutation({
    mutationFn: (data: any) => api.post('/farm/zones', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['zones'] })
      setShowZoneForm(false)
      setZoneForm({ name: '', type: 'GREENHOUSE', description: '', area: '' })
      toast.success('Bölge eklendi')
    },
  })

  const deleteCropMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/farm/crops/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] })
      queryClient.invalidateQueries({ queryKey: ['crop-stats'] })
      toast.success('Ürün silindi')
    },
  })

  const harvestMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.post(`/farm/crops/${id}/harvests`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] })
      queryClient.invalidateQueries({ queryKey: ['crop-stats'] })
      setHarvestForm({ quantity: '', unit: 'kg', quality: '', price: '', notes: '' })
      toast.success('Hasat kaydedildi')
    },
  })

  const irrigMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.post(`/farm/crops/${id}/irrigations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] })
      setIrrigForm({ amount: '', unit: 'litre', duration: '', ph: '', ec: '', notes: '' })
      toast.success('Sulama kaydedildi')
    },
  })

  const fertMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.post(`/farm/crops/${id}/fertilizations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crops'] })
      setFertForm({ fertilizerName: '', amount: '', unit: 'ml', notes: '' })
      toast.success('Gübreleme kaydedildi')
    },
  })

  const getCropTab = (id: string) => cropTab[id] || 'info'
  const setCropTabFn = (id: string, tab: string) => setCropTab(prev => ({ ...prev, [id]: tab }))

  return (
    <div className="space-y-4">
      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Toplam Ürün', value: stats.total, color: 'text-foreground' },
            { label: 'Büyüyor', value: stats.growing, color: 'text-green-600' },
            { label: 'Hasat Edildi', value: stats.harvested, color: 'text-yellow-600' },
            { label: 'Toplam Hasat', value: `${stats.totalHarvestKg} kg`, color: 'text-blue-600' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button onClick={() => setActiveTab('crops')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'crops' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>🌱 Ürünler</button>
          <button onClick={() => setActiveTab('zones')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'zones' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>🗺️ Bölgeler</button>
        </div>
        <div className="flex gap-2">
          {activeTab === 'crops' && (
            <>
              <div className="flex gap-1 bg-muted p-1 rounded-lg">
                {[['', 'Tümü'], ['GROWING', 'Büyüyor'], ['HARVESTED', 'Hasat']].map(([val, label]) => (
                  <button key={val} onClick={() => setStatusFilter(val)}
                    className={cn('px-2 py-1 text-xs font-medium rounded-md transition-colors',
                      statusFilter === val ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                    )}>{label}</button>
                ))}
              </div>
              <button onClick={() => setShowCropForm(!showCropForm)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
                <Plus className="w-4 h-4" /> Ürün Ekle
              </button>
            </>
          )}
          {activeTab === 'zones' && (
            <button onClick={() => setShowZoneForm(!showZoneForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
              <Plus className="w-4 h-4" /> Bölge Ekle
            </button>
          )}
        </div>
      </div>

      {/* Ürün Formu */}
      {activeTab === 'crops' && showCropForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Yeni Ürün Ekle</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ürün Adı *</label>
              <select value={cropForm.name} onChange={e => setCropForm({...cropForm, name: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="">Seç</option>
                {CROP_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                <option value="other">Diğer</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Çeşit</label>
              <input value={cropForm.variety} onChange={e => setCropForm({...cropForm, variety: e.target.value})}
                placeholder="Örn: Festival" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bölge</label>
              <select value={cropForm.zoneId} onChange={e => setCropForm({...cropForm, zoneId: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="">Seç</option>
                {(zones as any[]).map((z: any) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Dikim Tarihi</label>
              <input type="date" value={cropForm.plantDate} onChange={e => setCropForm({...cropForm, plantDate: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tahmini Hasat</label>
              <input type="date" value={cropForm.expectedHarvest} onChange={e => setCropForm({...cropForm, expectedHarvest: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Alan (m²)</label>
              <input type="number" value={cropForm.area} onChange={e => setCropForm({...cropForm, area: e.target.value})}
                placeholder="m²" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          </div>
          <textarea value={cropForm.notes} onChange={e => setCropForm({...cropForm, notes: e.target.value})}
            placeholder="Notlar" rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none" />
          <div className="flex gap-2">
            <button onClick={() => createCropMutation.mutate(cropForm)}
              disabled={!cropForm.name || createCropMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
              {createCropMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setShowCropForm(false)}
              className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">İptal</button>
          </div>
        </div>
      )}

      {/* Bölge Formu */}
      {activeTab === 'zones' && showZoneForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Yeni Bölge Ekle</h3>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bölge Adı *</label>
              <input value={zoneForm.name} onChange={e => setZoneForm({...zoneForm, name: e.target.value})}
                placeholder="Sera A" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tür</label>
              <select value={zoneForm.type} onChange={e => setZoneForm({...zoneForm, type: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                {Object.entries(ZONE_TYPE_TR).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Alan (m²)</label>
              <input type="number" value={zoneForm.area} onChange={e => setZoneForm({...zoneForm, area: e.target.value})}
                placeholder="m²" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
              <input value={zoneForm.description} onChange={e => setZoneForm({...zoneForm, description: e.target.value})}
                placeholder="Opsiyonel" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createZoneMutation.mutate(zoneForm)}
              disabled={!zoneForm.name || createZoneMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
              {createZoneMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setShowZoneForm(false)}
              className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">İptal</button>
          </div>
        </div>
      )}

      {/* ÜRÜN LİSTESİ */}
      {activeTab === 'crops' && (
        cropsLoading ? (
          <div className="text-center text-muted-foreground py-8">Yükleniyor...</div>
        ) : (crops as any[]).length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <div className="text-4xl mb-2">🌱</div>
            <p className="text-sm">Henüz ürün eklenmemiş</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(crops as any[]).map((crop: any) => (
              <div key={crop.id} className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="flex items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpanded(expanded === crop.id ? null : crop.id)}>
                  <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-lg shrink-0">
                    {crop.name === 'Çilek' ? '🍓' : crop.name === 'Marul' ? '🥬' : crop.name === 'Fesleğen' ? '🌿' : crop.name === 'Mantar' ? '🍄' : '🌱'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{crop.name}</span>
                      {crop.variety && <span className="text-xs text-muted-foreground">({crop.variety})</span>}
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[crop.status])}>
                        {STATUS_TR[crop.status]}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                      {crop.zone && <span>{crop.zone.name}</span>}
                      {crop.area && <span>📐 {crop.area} m²</span>}
                      {crop.plantDate && <span>🌱 {new Date(crop.plantDate).toLocaleDateString('tr-TR')}</span>}
                      {crop.expectedHarvest && <span>🌾 {new Date(crop.expectedHarvest).toLocaleDateString('tr-TR')}</span>}
                      {crop._count?.harvests > 0 && <span>✅ {crop._count.harvests} hasat</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); deleteCropMutation.mutate(crop.id) }}
                      className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {expanded === crop.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </div>

                {expanded === crop.id && (
                  <div className="border-t border-border">
                    <div className="flex border-b border-border">
                      {[['info','Bilgi'],['harvest','Hasat'],['irrigation','Sulama'],['fertilization','Gübreleme']].map(([tab, label]) => (
                        <button key={tab} onClick={() => setCropTabFn(crop.id, tab)}
                          className={cn('px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                            getCropTab(crop.id) === tab
                              ? 'border-green-600 text-green-600'
                              : 'border-transparent text-muted-foreground hover:text-foreground'
                          )}>{label}</button>
                      ))}
                    </div>

                    <div className="p-4">
                      {/* Bilgi */}
                      {getCropTab(crop.id) === 'info' && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          {crop.zone && <div><span className="text-muted-foreground">Bölge:</span> {crop.zone.name}</div>}
                          {crop.area && <div><span className="text-muted-foreground">Alan:</span> {crop.area} m²</div>}
                          {crop.plantDate && <div><span className="text-muted-foreground">Dikim:</span> {new Date(crop.plantDate).toLocaleDateString('tr-TR')}</div>}
                          {crop.expectedHarvest && <div><span className="text-muted-foreground">Tahmini Hasat:</span> {new Date(crop.expectedHarvest).toLocaleDateString('tr-TR')}</div>}
                          {crop.notes && <div className="col-span-2"><span className="text-muted-foreground">Not:</span> {crop.notes}</div>}
                          {crop.harvests?.length > 0 && (
                            <div className="col-span-2 mt-2">
                              <div className="text-xs font-medium text-muted-foreground mb-1">Son Hasatlar</div>
                              {crop.harvests.map((h: any) => (
                                <div key={h.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded-lg mb-1">
                                  <span className="font-semibold text-yellow-600">{h.quantity} {h.unit}</span>
                                  <span className="text-muted-foreground">{new Date(h.harvestedAt).toLocaleDateString('tr-TR')}</span>
                                  {h.price && <span className="text-green-600">{h.price} ₺/kg</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Hasat */}
                      {getCropTab(crop.id) === 'harvest' && (
                        <div className="space-y-3">
                          <div className="text-xs font-medium text-muted-foreground">Hasat Kaydı Ekle</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Miktar *</label>
                              <input type="number" value={harvestForm.quantity} onChange={e => setHarvestForm({...harvestForm, quantity: e.target.value})}
                                placeholder="kg" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Birim</label>
                              <select value={harvestForm.unit} onChange={e => setHarvestForm({...harvestForm, unit: e.target.value})}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background">
                                <option value="kg">kg</option>
                                <option value="adet">adet</option>
                                <option value="demet">demet</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Kalite</label>
                              <select value={harvestForm.quality} onChange={e => setHarvestForm({...harvestForm, quality: e.target.value})}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background">
                                <option value="">Seç</option>
                                <option value="1. Sınıf">1. Sınıf</option>
                                <option value="2. Sınıf">2. Sınıf</option>
                                <option value="3. Sınıf">3. Sınıf</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Fiyat (₺/kg)</label>
                              <input type="number" value={harvestForm.price} onChange={e => setHarvestForm({...harvestForm, price: e.target.value})}
                                placeholder="₺" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                          </div>
                          <button onClick={() => harvestMutation.mutate({ id: crop.id, data: harvestForm })}
                            disabled={!harvestForm.quantity || harvestMutation.isPending}
                            className="px-3 py-1.5 bg-yellow-600 text-white text-xs rounded-lg disabled:opacity-50 flex items-center gap-1">
                            <Package className="w-3 h-3" /> Hasat Kaydet
                          </button>
                        </div>
                      )}

                      {/* Sulama */}
                      {getCropTab(crop.id) === 'irrigation' && (
                        <div className="space-y-3">
                          <div className="text-xs font-medium text-muted-foreground">Sulama Kaydı Ekle</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Miktar *</label>
                              <input type="number" value={irrigForm.amount} onChange={e => setIrrigForm({...irrigForm, amount: e.target.value})}
                                placeholder="litre" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Süre (dk)</label>
                              <input type="number" value={irrigForm.duration} onChange={e => setIrrigForm({...irrigForm, duration: e.target.value})}
                                placeholder="dakika" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">pH</label>
                              <input type="number" value={irrigForm.ph} onChange={e => setIrrigForm({...irrigForm, ph: e.target.value})}
                                placeholder="6.0" step="0.1" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">EC (mS/cm)</label>
                              <input type="number" value={irrigForm.ec} onChange={e => setIrrigForm({...irrigForm, ec: e.target.value})}
                                placeholder="1.2" step="0.1" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                          </div>
                          <button onClick={() => irrigMutation.mutate({ id: crop.id, data: irrigForm })}
                            disabled={!irrigForm.amount || irrigMutation.isPending}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50 flex items-center gap-1">
                            <Droplets className="w-3 h-3" /> Sulama Kaydet
                          </button>
                        </div>
                      )}

                      {/* Gübreleme */}
                      {getCropTab(crop.id) === 'fertilization' && (
                        <div className="space-y-3">
                          <div className="text-xs font-medium text-muted-foreground">Gübreleme Kaydı Ekle</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Gübre Adı *</label>
                              <select value={fertForm.fertilizerName} onChange={e => setFertForm({...fertForm, fertilizerName: e.target.value})}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background">
                                <option value="">Seç</option>
                                <option value="A Solüsyonu">A Solüsyonu</option>
                                <option value="B Solüsyonu">B Solüsyonu</option>
                                <option value="Fosforik Asit">Fosforik Asit</option>
                                <option value="Potasyum Nitrat">Potasyum Nitrat</option>
                                <option value="Kalsiyum Nitrat">Kalsiyum Nitrat</option>
                                <option value="Magnezyum Sülfat">Magnezyum Sülfat</option>
                                <option value="Demir Kelat">Demir Kelat</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Miktar *</label>
                              <input type="number" value={fertForm.amount} onChange={e => setFertForm({...fertForm, amount: e.target.value})}
                                placeholder="ml" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Birim</label>
                              <select value={fertForm.unit} onChange={e => setFertForm({...fertForm, unit: e.target.value})}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background">
                                <option value="ml">ml</option>
                                <option value="litre">litre</option>
                                <option value="gr">gr</option>
                                <option value="kg">kg</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Not</label>
                              <input value={fertForm.notes} onChange={e => setFertForm({...fertForm, notes: e.target.value})}
                                placeholder="Opsiyonel" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                          </div>
                          <button onClick={() => fertMutation.mutate({ id: crop.id, data: fertForm })}
                            disabled={!fertForm.fertilizerName || !fertForm.amount || fertMutation.isPending}
                            className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg disabled:opacity-50 flex items-center gap-1">
                            <Sprout className="w-3 h-3" /> Gübreleme Kaydet
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {/* BÖLGE LİSTESİ */}
      {activeTab === 'zones' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {(zones as any[]).map((zone: any) => (
            <div key={zone.id} className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="text-sm font-semibold">{zone.name}</div>
                  <div className="text-xs text-muted-foreground">{ZONE_TYPE_TR[zone.type]}</div>
                </div>
                {zone.area && <span className="text-xs text-muted-foreground">📐 {zone.area} m²</span>}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                <span>🌱 {zone._count?.crops || 0} ürün</span>
                <span>🐑 {zone._count?.animals || 0} hayvan</span>
                <span>📡 {zone.devices?.filter((d: any) => d.isOnline).length || 0} cihaz</span>
              </div>
              {zone.description && <div className="text-xs text-muted-foreground mt-1">{zone.description}</div>}
            </div>
          ))}
          {(zones as any[]).length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground py-8">
              <div className="text-3xl mb-2">🗺️</div>
              <p className="text-sm">Henüz bölge eklenmemiş</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
