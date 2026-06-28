'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Plus, AlertTriangle, TrendingDown, TrendingUp, Package, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'

const DEFAULT_CATEGORIES = [
  { name: 'Yem',            unit: 'kg' },
  { name: 'Gübre (A+B)',    unit: 'litre' },
  { name: 'İlaç/Veteriner', unit: 'adet' },
  { name: 'Tohum/Fide',     unit: 'adet' },
  { name: 'Yakıt',          unit: 'litre' },
  { name: 'Ambalaj',        unit: 'adet' },
  { name: 'Temizlik',       unit: 'adet' },
]

export default function StockPage() {
  const [activeTab, setActiveTab] = useState<'list' | 'categories'>('list')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showStockForm, setShowStockForm] = useState(false)
  const [showCatForm, setShowCatForm] = useState(false)
  const [showMovementForm, setShowMovementForm] = useState<string | null>(null)
  const [catFilter, setCatFilter] = useState('')
  const [stockForm, setStockForm] = useState({ name: '', code: '', categoryId: '', unit: '', minQuantity: '', price: '', location: '' })
  const [catForm, setCatForm] = useState({ name: '', unit: 'kg' })
  const [movForm, setMovForm] = useState({ type: 'IN', quantity: '', unitPrice: '', reason: '', notes: '' })
  const queryClient = useQueryClient()

  const { data: stocks = [], isLoading } = useQuery({
    queryKey: ['stocks', catFilter],
    queryFn: () => api.get(`/stock${catFilter ? `?categoryId=${catFilter}` : ''}`).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['stock-categories'],
    queryFn: () => api.get('/stock/categories').then(r => r.data),
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['stock-alerts'],
    queryFn: () => api.get('/stock/alerts').then(r => r.data),
    refetchInterval: 60000,
  })

  const createStockMutation = useMutation({
    mutationFn: (data: any) => api.post('/stock', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] })
      setShowStockForm(false)
      setStockForm({ name: '', code: '', categoryId: '', unit: '', minQuantity: '', price: '', location: '' })
      toast.success('Stok kalemi eklendi')
    },
    onError: () => toast.error('Hata oluştu'),
  })

  const createCatMutation = useMutation({
    mutationFn: (data: any) => api.post('/stock/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-categories'] })
      setShowCatForm(false)
      setCatForm({ name: '', unit: 'kg' })
      toast.success('Kategori eklendi')
    },
  })

  const movementMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.post(`/stock/${id}/movement`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stocks'] })
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] })
      setShowMovementForm(null)
      setMovForm({ type: 'IN', quantity: '', unitPrice: '', reason: '', notes: '' })
      toast.success('Stok hareketi kaydedildi')
    },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Hata oluştu'),
  })

  const lowStocks = (stocks as any[]).filter((s: any) => s.minQuantity && s.quantity <= s.minQuantity)

  return (
    <div className="space-y-4">
      {/* Uyarılar */}
      {(alerts as any[]).length > 0 && (
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-semibold text-orange-500">{(alerts as any[]).length} stok kalemi minimum seviyede!</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(alerts as any[]).map((a: any) => (
              <span key={a.id} className={cn('text-xs px-2 py-1 rounded-full',
                a.critical ? 'bg-red-500/15 text-red-500' : 'bg-orange-500/15 text-orange-600'
              )}>
                {a.name}: {a.current} {a.unit} {a.critical ? '(TÜKENDİ!)' : `(min: ${a.minimum})`}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">{(stocks as any[]).length}</div>
          <div className="text-xs text-muted-foreground">Toplam Kalem</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className={cn('text-2xl font-bold', lowStocks.length > 0 ? 'text-orange-500' : 'text-green-600')}>
            {lowStocks.length}
          </div>
          <div className="text-xs text-muted-foreground">Düşük Stok</div>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 text-center">
          <div className="text-2xl font-bold">{(categories as any[]).length}</div>
          <div className="text-xs text-muted-foreground">Kategori</div>
        </div>
      </div>

      {/* Tab + Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button onClick={() => setActiveTab('list')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'list' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>📦 Stok Listesi</button>
          <button onClick={() => setActiveTab('categories')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === 'categories' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>🏷️ Kategoriler</button>
        </div>
        <div className="flex gap-2">
          {activeTab === 'list' && (
            <>
              <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="">Tüm Kategoriler</option>
                {(categories as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button onClick={() => setShowStockForm(!showStockForm)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
                <Plus className="w-4 h-4" /> Kalem Ekle
              </button>
            </>
          )}
          {activeTab === 'categories' && (
            <button onClick={() => setShowCatForm(!showCatForm)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
              <Plus className="w-4 h-4" /> Kategori Ekle
            </button>
          )}
        </div>
      </div>

      {/* Stok Formu */}
      {activeTab === 'list' && showStockForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Yeni Stok Kalemi</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Adı *</label>
              <input value={stockForm.name} onChange={e => setStockForm({...stockForm, name: e.target.value})}
                placeholder="Stok adı" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Kategori *</label>
              <select value={stockForm.categoryId} onChange={e => setStockForm({...stockForm, categoryId: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="">Seç</option>
                {(categories as any[]).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Birim *</label>
              <input value={stockForm.unit} onChange={e => setStockForm({...stockForm, unit: e.target.value})}
                placeholder="kg, litre, adet..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Min. Stok</label>
              <input type="number" value={stockForm.minQuantity} onChange={e => setStockForm({...stockForm, minQuantity: e.target.value})}
                placeholder="Uyarı seviyesi" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Birim Fiyat (₺)</label>
              <input type="number" value={stockForm.price} onChange={e => setStockForm({...stockForm, price: e.target.value})}
                placeholder="₺" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Konum</label>
              <input value={stockForm.location} onChange={e => setStockForm({...stockForm, location: e.target.value})}
                placeholder="Depo A, Raf 3..." className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => createStockMutation.mutate(stockForm)}
              disabled={!stockForm.name || !stockForm.categoryId || !stockForm.unit || createStockMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
              {createStockMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => setShowStockForm(false)}
              className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">İptal</button>
          </div>
        </div>
      )}

      {/* Kategori Formu */}
      {activeTab === 'categories' && showCatForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Yeni Kategori</h3>
          <div className="flex gap-2">
            <input value={catForm.name} onChange={e => setCatForm({...catForm, name: e.target.value})}
              placeholder="Kategori adı *" className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            <input value={catForm.unit} onChange={e => setCatForm({...catForm, unit: e.target.value})}
              placeholder="Birim" className="w-24 px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            <button onClick={() => createCatMutation.mutate(catForm)}
              disabled={!catForm.name || createCatMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">Kaydet</button>
          </div>
          <div className="text-xs text-muted-foreground">Hızlı ekle:</div>
          <div className="flex flex-wrap gap-1">
            {DEFAULT_CATEGORIES.map(dc => (
              <button key={dc.name} onClick={() => createCatMutation.mutate(dc)}
                className="px-2 py-1 text-xs border border-border rounded-lg hover:bg-accent">
                + {dc.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STOK LİSTESİ */}
      {activeTab === 'list' && (
        isLoading ? (
          <div className="text-center text-muted-foreground py-8">Yükleniyor...</div>
        ) : (stocks as any[]).length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Stok kalemi bulunamadı</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(stocks as any[]).map((stock: any) => {
              const isLow = stock.minQuantity && stock.quantity <= stock.minQuantity
              const isCritical = stock.quantity === 0
              return (
                <div key={stock.id} className={cn('bg-card border rounded-xl overflow-hidden',
                  isCritical ? 'border-red-500/50' : isLow ? 'border-orange-500/50' : 'border-border'
                )}>
                  <div className="flex items-center gap-3 p-4 cursor-pointer"
                    onClick={() => setExpanded(expanded === stock.id ? null : stock.id)}>
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 text-sm font-bold',
                      isCritical ? 'bg-red-500' : isLow ? 'bg-orange-500' : 'bg-green-700'
                    )}>
                      {isCritical ? '!' : isLow ? '↓' : '✓'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{stock.name}</span>
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {stock.category?.name}
                        </span>
                        {isCritical && <span className="text-xs text-red-500 font-medium">TÜKENDİ</span>}
                        {isLow && !isCritical && <span className="text-xs text-orange-500 font-medium">DÜŞÜK</span>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                        <span className={cn('font-semibold', isCritical ? 'text-red-500' : isLow ? 'text-orange-500' : 'text-green-600')}>
                          {stock.quantity} {stock.unit}
                        </span>
                        {stock.minQuantity && <span>min: {stock.minQuantity} {stock.unit}</span>}
                        {stock.location && <span>📍 {stock.location}</span>}
                        {stock.price && <span>₺{Number(stock.price).toLocaleString('tr-TR')}/{stock.unit}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={e => { e.stopPropagation(); setShowMovementForm(stock.id); setExpanded(stock.id) }}
                        className="px-2 py-1 text-xs bg-green-700 text-white rounded-lg">
                        + Hareket
                      </button>
                      {expanded === stock.id ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
                    </div>
                  </div>

                  {expanded === stock.id && (
                    <div className="border-t border-border p-4 space-y-3">
                      {/* Hareket formu */}
                      {showMovementForm === stock.id && (
                        <div className="space-y-2 p-3 bg-muted rounded-lg">
                          <div className="text-xs font-medium">Stok Hareketi</div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">İşlem</label>
                              <select value={movForm.type} onChange={e => setMovForm({...movForm, type: e.target.value})}
                                className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background">
                                <option value="IN">📥 Giriş</option>
                                <option value="OUT">📤 Çıkış</option>
                                <option value="ADJUSTMENT">⚖️ Düzeltme</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Miktar *</label>
                              <input type="number" value={movForm.quantity} onChange={e => setMovForm({...movForm, quantity: e.target.value})}
                                placeholder={stock.unit} className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Birim Fiyat (₺)</label>
                              <input type="number" value={movForm.unitPrice} onChange={e => setMovForm({...movForm, unitPrice: e.target.value})}
                                placeholder="₺" className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground mb-1 block">Sebep</label>
                              <input value={movForm.reason} onChange={e => setMovForm({...movForm, reason: e.target.value})}
                                placeholder="Satın alma, tüketim..." className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => movementMutation.mutate({ id: stock.id, data: movForm })}
                              disabled={!movForm.quantity || movementMutation.isPending}
                              className={cn('px-3 py-1.5 text-white text-xs rounded-lg disabled:opacity-50',
                                movForm.type === 'IN' ? 'bg-green-700' : movForm.type === 'OUT' ? 'bg-red-600' : 'bg-blue-600'
                              )}>
                              {movementMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
                            </button>
                            <button onClick={() => setShowMovementForm(null)}
                              className="px-3 py-1.5 border border-border text-xs rounded-lg">İptal</button>
                          </div>
                        </div>
                      )}

                      {/* Son hareketler */}
                      {stock.movements?.length > 0 && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-1">Son Hareketler</div>
                          <div className="space-y-1">
                            {stock.movements.map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded-lg">
                                <span className="flex items-center gap-1">
                                  {m.type === 'IN' ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                                  {m.type === 'IN' ? '+' : '-'}{m.quantity} {stock.unit}
                                </span>
                                {m.reason && <span className="text-muted-foreground">{m.reason}</span>}
                                <span className="text-muted-foreground">{new Date(m.createdAt).toLocaleDateString('tr-TR')}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* KATEGORİ LİSTESİ */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {(categories as any[]).map((cat: any) => (
            <div key={cat.id} className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-green-500/50"
              onClick={() => { setActiveTab('list'); setCatFilter(cat.id) }}>
              <div className="text-sm font-semibold">{cat.name}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{cat.unit}</div>
              <div className="text-lg font-bold text-green-600 mt-1">{cat._count?.stocks || 0}</div>
              <div className="text-xs text-muted-foreground">kalem</div>
            </div>
          ))}
          {(categories as any[]).length === 0 && (
            <div className="col-span-3 text-center text-muted-foreground py-8">
              <p className="text-sm">Henüz kategori eklenmemiş</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}