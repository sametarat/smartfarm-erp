'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { Plus, Bell, Calendar, ChevronLeft, ChevronRight, CheckSquare } from 'lucide-react'

// ============================================================
// KOCAELİ/ÇAYIRKÖY EKİM TAKVİMİ VERİLERİ
// ============================================================

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']
const MONTHS_SHORT = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

type EventType = 'ekim' | 'dikim' | 'hasat' | 'bakim' | 'hayvan' | 'ilaclama' | 'gübreleme'

interface CalendarEvent {
  id: string
  title: string
  type: EventType
  months: number[] // 1-12
  description: string
  urgent?: boolean
  tasks?: string[]
}

const CALENDAR_EVENTS: CalendarEvent[] = [
  // ── SERA ÜRÜNLERİ ──
  {
    id: 'cilek-dikim',
    title: 'Çilek Dikimi',
    type: 'dikim',
    months: [9, 10],
    description: 'Felicity/Portola fide dikimi. Soilless sistem, 5 sıra × 3 oluk. Fide başına 0.25-0.30 L çözelti.',
    tasks: ['Olukları dezenfekte et', 'pH 5.8-6.0 ayarla', 'EC 0.8 ile başla', 'Fideleri ıslat, kökleri yay']
  },
  {
    id: 'cilek-hasat',
    title: 'Çilek Hasadı Başlangıcı',
    type: 'hasat',
    months: [12, 1, 2, 3, 4],
    description: 'Kırmızılaşma %80+ iken hasat. Sabah erken veya akşam serin saatte. Günlük hasat hedefi: 3-5 kg/m².',
    tasks: ['Tartıp kayıt et', 'Soğuk zinciri koru', 'Sınıflandır (1-2-3. sınıf)']
  },
  {
    id: 'marul-ekim',
    title: 'Marul / Roka Ekimi',
    type: 'ekim',
    months: [9, 10, 11, 2, 3],
    description: 'Batavia / kıvırcık marul. 35-45 günde hasat. Kış aylarında düşük ısıtma maliyeti.',
    tasks: ['Viyol hazırla', 'Tohum ek (2-3/viyol)', 'Sisleme sistemi aç', '7-10 günde fideleyi seyrelt']
  },
  {
    id: 'fesleğen-ekim',
    title: 'Fesleğen / Maydanoz',
    type: 'ekim',
    months: [4, 5, 8, 9],
    description: 'Çilek hasadı sonrası dolgu ürünü. 20-25 günde hasat, yüksek birim fiyat.',
    tasks: ['Tohumları ıslatıp ek', 'Gündüz 22-25°C tut', 'Bolca ışık (14+ saat)']
  },
  {
    id: 'domates',
    title: 'Domates Dikimi',
    type: 'dikim',
    months: [3, 4],
    description: 'Salkım domates, yaz serası için. Haziran-Eylül arası hasat.',
    tasks: ['İp sistemi kur', 'Ç 1 gövde büyüt', 'Yan sürgün al', 'Tozlaşma için salla']
  },
  {
    id: 'domates-hasat',
    title: 'Domates Hasadı',
    type: 'hasat',
    months: [6, 7, 8, 9],
    description: 'Yaz hasadı. Salkım başına 4-5 domates hedefi.',
    tasks: ['Kırmızılaşmayı bekle', 'Tartıp kaydet', 'Salkımla hasat et']
  },

  // ── MARALFALFA ──
  {
    id: 'maralfalfa-ekim',
    title: 'Maralfalfa Ekim',
    type: 'ekim',
    months: [3, 4, 9],
    description: '5 dönüm faz 1 ekimi. Çelik veya tohum ile. İlk biçim 60-70 günde.',
    tasks: ['Tarlayı sür ve diskle', 'Gübre uygula (DAP)', 'Çelik: 20cm aralık', 'Sulama sistemini kur']
  },
  {
    id: 'maralfalfa-bicim',
    title: 'Maralfalfa Biçimi',
    type: 'hasat',
    months: [5, 6, 7, 8, 9, 10],
    description: '45-60 günde bir biçim. Yılda 4-6 biçim. Hedef: 8-12 ton/dönüm/yıl.',
    tasks: ['15-20cm yükseklikte biç', 'Soldur ve balya yap', 'Ahır yem deposuna koy', 'Biçim miktarını kaydet']
  },

  // ── HAYVANCILIK ──
  {
    id: 'koyun-ciflesme',
    title: 'Koyun Çiftleşme',
    type: 'hayvan',
    months: [9, 10],
    description: 'İle de France: Eylül-Ekim çiftleşme dönemi. Gebelik süresi 147-150 gün.',
    tasks: ['Koçu sürüye kat', 'Çiftleşme tarihleri kaydet', 'Koç vücut kondisyonu kontrol', 'Dişileri gebelik için hazırla']
  },
  {
    id: 'koyun-dogum',
    title: 'Koyun Doğum Dönemi',
    type: 'hayvan',
    months: [2, 3],
    description: 'Eylül çiftleşmesinden ~150 gün sonra. 24 saat gözetim gerekli.',
    urgent: true,
    tasks: ['Doğum kafeslerini hazırla', 'Veterineri bildir', 'Yavruya kolostrum ver (ilk 2 saat)', 'Kuzuyu tartıp kaydet', 'Anneyi gözlemle (meme iltihapı)']
  },
  {
    id: 'asi-ilkbahar',
    title: 'İlkbahar Aşı Dönemi',
    type: 'ilaclama',
    months: [3, 4],
    description: 'Enteroktoksemi, şarbon, ayak çürüklüğü aşıları. Tüm sürü.',
    tasks: ['Veteriner randevusu al', 'Aşı kartlarını güncelle', 'Kuzuları da dahil et', 'Aşı sonrası 24 saat gözlem']
  },
  {
    id: 'asi-sonbahar',
    title: 'Sonbahar Aşı Dönemi',
    type: 'ilaclama',
    months: [9, 10],
    description: 'Kış öncesi takviye aşıları + parazit tedavisi.',
    tasks: ['Antiparaziter ilaç ver', 'Tırnak bakımı yap', 'Diş kontrolü', 'Vücut kondisyon skoru al']
  },
  {
    id: 'kırkım',
    title: 'Koyun Kırkımı',
    type: 'bakim',
    months: [4, 5],
    description: 'Yılda bir kırkım. Kırkım öncesi 24 saat aç bırak. Yün satışı veya imha.',
    tasks: ['Kırkım ekibi ayarla', 'Kırkım makasını bilele', 'Yün torbalara doldur', 'Kırkım sonrası parazit kontrolü']
  },
  {
    id: 'koyun-satis',
    title: 'Kuzu / Koyun Satışı',
    type: 'hayvan',
    months: [6, 7, 10, 11],
    description: 'Kurban öncesi (Haziran-Temmuz) ve Kasım pazarları en yüksek fiyat.',
    tasks: ['Alıcı listesi oluştur', 'Küpeleri kontrol et', 'Sağlık sertifikası al', 'Tartıp fiyat belirle']
  },

  // ── GENEL BAKIM ──
  {
    id: 'sera-dezenfeksiyon',
    title: 'Sera Dezenfeksiyonu',
    type: 'bakim',
    months: [8, 9],
    description: 'Yeni sezon öncesi sera temizliği. Fungus ve böcek ilaçlaması.',
    tasks: ['Tüm bitkileri söküp temizle', 'Suyla yüksek basınç yıka', 'H2O2 veya kükürt buharlat', 'Sistemi kuru bırak 7 gün']
  },
  {
    id: 'gübreleme-bahar',
    title: 'Tarla Bahar Gübreleme',
    type: 'gübreleme',
    months: [3, 4],
    description: 'Maralfalfa ve tarla alanları için DAP + üre uygulaması.',
    tasks: ['Toprak analizi yaptır', 'DAP: 25 kg/dönüm', 'Üre: 15 kg/dönüm', 'Yağmur öncesi uygula']
  },
]

const TYPE_CONFIG = {
  ekim:       { label: 'Ekim',        color: 'bg-green-500/15 text-green-700 border-green-500/30',    dot: 'bg-green-500' },
  dikim:      { label: 'Dikim',       color: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30', dot: 'bg-emerald-500' },
  hasat:      { label: 'Hasat',       color: 'bg-yellow-500/15 text-yellow-700 border-yellow-500/30', dot: 'bg-yellow-500' },
  bakim:      { label: 'Bakım',       color: 'bg-blue-500/15 text-blue-700 border-blue-500/30',       dot: 'bg-blue-500' },
  hayvan:     { label: 'Hayvancılık', color: 'bg-orange-500/15 text-orange-700 border-orange-500/30', dot: 'bg-orange-500' },
  ilaclama:   { label: 'Aşı/İlaç',   color: 'bg-red-500/15 text-red-700 border-red-500/30',          dot: 'bg-red-500' },
  gübreleme:  { label: 'Gübreleme',   color: 'bg-purple-500/15 text-purple-700 border-purple-500/30', dot: 'bg-purple-500' },
}

export default function CalendarPage() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [activeFilter, setActiveFilter] = useState<EventType | ''>('')
  const [view, setView] = useState<'month' | 'year'>('month')
  const queryClient = useQueryClient()

  const createTasksMutation = useMutation({
    mutationFn: async (event: CalendarEvent) => {
      const tasks = event.tasks || []
      const results = []
      for (const task of tasks) {
        const res = await api.post('/tasks', {
          title: `[${event.title}] ${task}`,
          description: event.description,
          priority: event.urgent ? 'HIGH' : 'MEDIUM',
          dueDate: new Date(new Date().getFullYear(), selectedMonth - 1, 15).toISOString(),
        })
        results.push(res.data)
      }
      return results
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      toast.success(`${results.length} görev oluşturuldu`)
      setSelectedEvent(null)
    },
    onError: () => toast.error('Görev oluşturulurken hata'),
  })

  const monthEvents = CALENDAR_EVENTS.filter(e =>
    e.months.includes(selectedMonth) &&
    (!activeFilter || e.type === activeFilter)
  )

  const prevMonth = () => setSelectedMonth(m => m === 1 ? 12 : m - 1)
  const nextMonth = () => setSelectedMonth(m => m === 12 ? 1 : m + 1)

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-bold">Ekim & Üretim Takvimi</h2>
          <p className="text-xs text-muted-foreground">Kocaeli / Çayırköy — Sera + Tarla + Hayvancılık</p>
        </div>
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          <button onClick={() => setView('month')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              view === 'month' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>📅 Aylık</button>
          <button onClick={() => setView('year')}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              view === 'year' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>📊 Yıllık Özet</button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-1.5">
        <button onClick={() => setActiveFilter('')}
          className={cn('px-2.5 py-1 text-xs rounded-full border transition-colors',
            !activeFilter ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:bg-accent'
          )}>Tümü</button>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <button key={type} onClick={() => setActiveFilter(activeFilter === type ? '' : type as EventType)}
            className={cn('px-2.5 py-1 text-xs rounded-full border transition-colors',
              activeFilter === type ? cfg.color + ' border-current' : 'border-border text-muted-foreground hover:bg-accent'
            )}>{cfg.label}</button>
        ))}
      </div>

      {/* AYLIK GÖRÜNÜM */}
      {view === 'month' && (
        <div className="space-y-4">
          {/* Ay navigasyonu */}
          <div className="flex items-center justify-between">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-accent">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h3 className="text-lg font-bold">{MONTHS[selectedMonth - 1]}</h3>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-accent">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Ay özet mini strip */}
          <div className="grid grid-cols-12 gap-0.5 bg-card border border-border rounded-xl p-3">
            {MONTHS_SHORT.map((m, i) => {
              const monthNum = i + 1
              const hasEvents = CALENDAR_EVENTS.some(e => e.months.includes(monthNum))
              const eventTypes = [...new Set(CALENDAR_EVENTS.filter(e => e.months.includes(monthNum)).map(e => e.type))]
              return (
                <button key={m} onClick={() => setSelectedMonth(monthNum)}
                  className={cn('flex flex-col items-center gap-0.5 p-1 rounded-lg transition-colors',
                    selectedMonth === monthNum ? 'bg-green-500/20' : 'hover:bg-accent'
                  )}>
                  <span className={cn('text-xs font-medium', selectedMonth === monthNum ? 'text-green-600' : 'text-muted-foreground')}>{m}</span>
                  <div className="flex flex-wrap justify-center gap-0.5">
                    {eventTypes.slice(0, 3).map(t => (
                      <div key={t} className={cn('w-1 h-1 rounded-full', TYPE_CONFIG[t].dot)} />
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Ay etkinlikleri */}
          {monthEvents.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Bu ay için etkinlik bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-2">
              {monthEvents.map(event => (
                <div key={event.id}
                  className={cn('bg-card border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all',
                    event.urgent ? 'border-red-500/30' : 'border-border'
                  )}
                  onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">{event.title}</span>
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', TYPE_CONFIG[event.type].color)}>
                          {TYPE_CONFIG[event.type].label}
                        </span>
                        {event.urgent && <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-500 border border-red-500/30 font-medium">⚠️ Önemli</span>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{event.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {event.tasks && (
                        <span className="text-xs text-muted-foreground">{event.tasks.length} görev</span>
                      )}
                    </div>
                  </div>

                  {selectedEvent?.id === event.id && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3">
                      {event.tasks && (
                        <div>
                          <div className="text-xs font-medium text-muted-foreground mb-2">Yapılacaklar:</div>
                          <div className="space-y-1">
                            {event.tasks.map((task, i) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <CheckSquare className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span>{task}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={e => { e.stopPropagation(); createTasksMutation.mutate(event) }}
                          disabled={createTasksMutation.isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg disabled:opacity-50">
                          <Plus className="w-3 h-3" />
                          {createTasksMutation.isPending ? 'Oluşturuluyor...' : 'Görev Olarak Ekle'}
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); toast.info(`${event.title} için hatırlatıcı ayarlandı`) }}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-xs rounded-lg hover:bg-accent">
                          <Bell className="w-3 h-3" /> Hatırlat
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* YILLIK ÖZET */}
      {view === 'year' && (
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-3 py-2 font-medium text-muted-foreground w-40">Etkinlik</th>
                  {MONTHS_SHORT.map(m => (
                    <th key={m} className="px-1 py-2 font-medium text-muted-foreground text-center">{m}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CALENDAR_EVENTS.filter(e => !activeFilter || e.type === activeFilter).map(event => (
                  <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full shrink-0', TYPE_CONFIG[event.type].dot)} />
                        <span className="font-medium truncate">{event.title}</span>
                      </div>
                    </td>
                    {Array.from({length: 12}, (_, i) => i + 1).map(month => (
                      <td key={month} className="px-1 py-2 text-center">
                        {event.months.includes(month) ? (
                          <div className={cn('w-4 h-4 rounded mx-auto', TYPE_CONFIG[event.type].dot, 'opacity-80')} />
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Renk açıklaması */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
              <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                {cfg.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}