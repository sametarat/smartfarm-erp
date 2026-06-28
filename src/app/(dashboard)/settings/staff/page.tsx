'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Phone, Mail, CheckSquare, BookOpen, Users, AlertTriangle } from 'lucide-react'

// ============================================================
// SABİT VERİLER — Talimatlar ve Kontrol Listesi
// ============================================================

const SOP_ITEMS = [
  {
    id: 'sera',
    title: '🌿 Sera Talimatları',
    color: 'border-green-500/30 bg-green-500/5',
    steps: [
      { title: 'Sabah Kontrolü (07:00)', items: ['pH ölçümünü yap (hedef: 5.8-6.2)', 'EC ölçümünü yap (hedef: 1.0-1.4 mS/cm)', 'Su deposu seviyesini kontrol et (%30 altındaysa doldur)', 'Bitki görsel kontrolü — sararma, hastalık, haşere', 'Fan ve LED çalışıyor mu kontrol et'] },
      { title: 'Gübreleme (A+B Solüsyonu)', items: ['A solüsyonu: 5ml/10L su', 'B solüsyonu: 5ml/10L su', 'Fosforik asit: pH 8+ ise 1-2ml ekle', 'Karıştırma sırası: önce su, sonra A, sonra B', 'Asla A ve B solüsyonunu direk karıştırma!'] },
      { title: 'Hasat', items: ['Çilekte kırmızılaşma %80+ ise hasat zamanı', 'Sabah erken veya akşam serin saatte hasat yap', 'Kirişleri 45° açıyla kes', 'Hasatı soğuk zincir bozulmadan depola', 'Tartıp kayıt yap'] },
      { title: 'Acil Durum', items: ['pH 7+ → Hemen fosforik asit ekle, otomasyon durdur', 'EC 2+ → Saf su ile seyreltt, sistemi yıka', 'Depo boşaldı → Pompayı durdur, tankı doldur', 'Hastalık tespiti → Bölgeyi izole et, ziraat müh. ara'] },
    ]
  },
  {
    id: 'ahir',
    title: '🐑 Ahır Talimatları',
    color: 'border-amber-500/30 bg-amber-500/5',
    steps: [
      { title: 'Sabah Rutini (07:00)', items: ['Yem dağıtımı: 25 baş × 1.5 kg = 37.5 kg kuru ot', 'Su yalakları kontrol et — temiz ve dolu olmalı', 'Hayvan sayımı yap', 'Gözle genel sağlık kontrolü', 'Scraper programını kontrol et'] },
      { title: 'Sağlık Kontrolü', items: ['Durgun / iştahsız hayvan → Veterinere bildir', 'Şişkinlik belirtisi → Hareket ettir, veteriner ara', 'Topallik → Ayak banyosu uygula, kaydını tut', 'Sümük / öksürük → Karantinaya al', 'Doğum işareti (huzursuzluk, meme şişmesi) → Nöbet tut'] },
      { title: 'Amonyak Alarmı', items: ['25 ppm → Fanları aç, havalandır', '50 ppm → Tüm fanlar tam güç, personel dışarı', 'Scraper çalıştır, ahırı temizle', 'Kritik geçmiyorsa 1 saat sonra ölç', 'Kayıt defterine gir'] },
      { title: 'Akşam Rutini (17:00)', items: ['Yem motorunu çalıştır (45 sn)', 'Su yalaklarını kontrol et', 'Aydınlatmayı kontrol et', 'Kapı ve pencereleri kapat (gece)', 'Gün sonu hayvan durumunu sisteme gir'] },
    ]
  },
  {
    id: 'genel',
    title: '📋 Genel Talimatlar',
    color: 'border-blue-500/30 bg-blue-500/5',
    steps: [
      { title: 'Acil Numaralar', items: ['Veteriner: +90 532 111 22 33', 'Ziraat Mühendisi: +90 544 444 55 66', 'Yem Tedarikçisi: +90 224 888 99 00', 'İşletme Sahibi: +90 555 000 00 00', 'Elektrikçi: +90 533 000 00 00'] },
      { title: 'Güvenlik', items: ['Kimyasal kullanırken eldiven ve gözlük tak', 'Elektrik paneline yetkisiz girme', 'Hayvan alanında sigara içme', 'Şüpheli durum → İşletme sahibine bildir', 'Kaza → İlk yardım çantası depo girişinde'] },
      { title: 'Kayıt Tutma', items: ['Her işlemi sisteme gir (SmartFarm ERP)', 'Hasat miktarını tartıp yaz', 'İlaç kullanımını belgele', 'Arıza ve anormalliği rapor et', 'Nöbet defterini imzala'] },
    ]
  },
]

const DAILY_CHECKLISTS = {
  sabah: [
    { id: 's1', text: 'Sera pH ölçümü (5.8-6.2)', zone: 'sera' },
    { id: 's2', text: 'Sera EC ölçümü (1.0-1.4)', zone: 'sera' },
    { id: 's3', text: 'Su deposu kontrolü', zone: 'sera' },
    { id: 's4', text: 'Ahır yem dağıtımı', zone: 'ahir' },
    { id: 's5', text: 'Hayvan sayımı', zone: 'ahir' },
    { id: 's6', text: 'Sağlık gözlem kontrolü', zone: 'ahir' },
    { id: 's7', text: 'SCADA sistem kontrolü', zone: 'genel' },
    { id: 's8', text: 'Alarm ve bildirim kontrolü', zone: 'genel' },
  ],
  oglen: [
    { id: 'o1', text: 'Sera bitki kontrolü', zone: 'sera' },
    { id: 'o2', text: 'Sulama miktarı kontrolü', zone: 'sera' },
    { id: 'o3', text: 'Su yalakları kontrolü', zone: 'ahir' },
    { id: 'o4', text: 'Amonyak ölçümü', zone: 'ahir' },
    { id: 'o5', text: 'Stok durumu kontrolü', zone: 'genel' },
  ],
  aksam: [
    { id: 'a1', text: 'Hasat tartımı ve kaydı', zone: 'sera' },
    { id: 'a2', text: 'Gübre ekimi (A+B)', zone: 'sera' },
    { id: 'a3', text: 'Ahır akşam yemi', zone: 'ahir' },
    { id: 'a4', text: 'Scraper çalıştırıldı', zone: 'ahir' },
    { id: 'a5', text: 'Kapı/pencere güvenliği', zone: 'ahir' },
    { id: 'a6', text: 'Günlük rapor sisteme girildi', zone: 'genel' },
  ],
}

const ZONE_BADGE: Record<string, string> = {
  sera:  'bg-green-500/15 text-green-600',
  ahir:  'bg-amber-500/15 text-amber-600',
  genel: 'bg-blue-500/15 text-blue-600',
}

export default function StaffGuidePage() {
  const [activeTab, setActiveTab] = useState<'personel' | 'talimatlar' | 'kontrol'>('kontrol')
  const [activeSop, setActiveSop] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})
  const [checkPeriod, setCheckPeriod] = useState<'sabah' | 'oglen' | 'aksam'>('sabah')

  // LocalStorage'dan checklist yükle
  useEffect(() => {
    const today = new Date().toLocaleDateString('tr-TR')
    const saved = localStorage.getItem(`checklist_${today}`)
    if (saved) setCheckedItems(JSON.parse(saved))
  }, [])

  const toggleCheck = (id: string) => {
    const updated = { ...checkedItems, [id]: !checkedItems[id] }
    setCheckedItems(updated)
    const today = new Date().toLocaleDateString('tr-TR')
    localStorage.setItem(`checklist_${today}`, JSON.stringify(updated))
  }

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data),
  })

  const currentList = DAILY_CHECKLISTS[checkPeriod]
  const completedCount = currentList.filter(item => checkedItems[item.id]).length
  const progress = Math.round((completedCount / currentList.length) * 100)

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {([['kontrol', '✅ Kontrol Listesi'], ['talimatlar', '📖 Talimatlar'], ['personel', '👥 Personel']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>{label}</button>
        ))}
      </div>

      {/* ===== KONTROL LİSTESİ ===== */}
      {activeTab === 'kontrol' && (
        <div className="space-y-4">
          {/* Periyot seçimi */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex gap-1 bg-muted p-1 rounded-lg">
              {([['sabah', '☀️ Sabah'], ['oglen', '🌤️ Öğlen'], ['aksam', '🌙 Akşam']] as const).map(([p, label]) => (
                <button key={p} onClick={() => setCheckPeriod(p)}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    checkPeriod === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                  )}>{label}</button>
              ))}
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          {/* İlerleme */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">{checkPeriod === 'sabah' ? 'Sabah' : checkPeriod === 'oglen' ? 'Öğlen' : 'Akşam'} Kontrolleri</span>
              <span className={cn('text-sm font-bold', progress === 100 ? 'text-green-600' : 'text-muted-foreground')}>
                {completedCount}/{currentList.length}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div className={cn('h-2 rounded-full transition-all duration-300', progress === 100 ? 'bg-green-500' : 'bg-blue-500')}
                style={{ width: `${progress}%` }} />
            </div>
            {progress === 100 && (
              <div className="mt-2 text-xs text-green-600 font-medium">✅ Tüm kontroller tamamlandı!</div>
            )}
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {currentList.map(item => (
              <div key={item.id}
                onClick={() => toggleCheck(item.id)}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                  checkedItems[item.id]
                    ? 'bg-green-500/5 border-green-500/20 opacity-70'
                    : 'bg-card border-border hover:bg-accent'
                )}>
                <div className={cn(
                  'w-5 h-5 rounded flex items-center justify-center shrink-0 transition-colors',
                  checkedItems[item.id] ? 'bg-green-500' : 'border-2 border-border'
                )}>
                  {checkedItems[item.id] && <span className="text-white text-xs">✓</span>}
                </div>
                <span className={cn('text-sm flex-1', checkedItems[item.id] && 'line-through text-muted-foreground')}>
                  {item.text}
                </span>
                <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ZONE_BADGE[item.zone])}>
                  {item.zone === 'sera' ? 'Sera' : item.zone === 'ahir' ? 'Ahır' : 'Genel'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== TALİMATLAR ===== */}
      {activeTab === 'talimatlar' && (
        <div className="space-y-3">
          {SOP_ITEMS.map(sop => (
            <div key={sop.id} className={cn('border rounded-xl overflow-hidden', sop.color)}>
              <button
                onClick={() => setActiveSop(activeSop === sop.id ? null : sop.id)}
                className="w-full flex items-center justify-between p-4 text-left">
                <span className="text-sm font-semibold">{sop.title}</span>
                <span className="text-xs text-muted-foreground">{activeSop === sop.id ? '▲' : '▼'}</span>
              </button>

              {activeSop === sop.id && (
                <div className="px-4 pb-4 space-y-4">
                  {sop.steps.map((step, si) => (
                    <div key={si}>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        {step.title}
                      </div>
                      <ul className="space-y-1">
                        {step.items.map((item, ii) => (
                          <li key={ii} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground mt-0.5 shrink-0">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ===== PERSONEL ===== */}
      {activeTab === 'personel' && (
        <div className="space-y-3">
          {(users as any[]).length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Personel bulunamadı</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(users as any[]).map((user: any) => (
                <div key={user.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                      {user.name[0]}{user.surname[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{user.name} {user.surname}</div>
                      <div className="text-xs text-muted-foreground">{user.role?.displayName}</div>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                      user.status === 'ACTIVE' ? 'bg-green-500/15 text-green-600' : 'bg-gray-500/15 text-gray-500'
                    )}>
                      {user.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1.5 pt-3 border-t border-border">
                    {user.email && (
                      <a href={`mailto:${user.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground">
                        <Mail className="w-3.5 h-3.5" /> {user.email}
                      </a>
                    )}
                    {user.phone && (
                      <a href={`tel:${user.phone}`} className="flex items-center gap-2 text-xs text-blue-500 hover:text-blue-600">
                        <Phone className="w-3.5 h-3.5" /> {user.phone}
                      </a>
                    )}
                    {user.telegramId && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        📱 Telegram bağlı
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sabit kurumsal rehber */}
          <div className="bg-card border border-border rounded-xl p-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Kurumsal Rehber
            </h3>
            <div className="space-y-2">
              {[
                { isim: 'Vet. Hek. Ahmet YILMAZ', rol: 'Küçükbaş Sağlık & Doğum', tel: '+90 532 111 22 33' },
                { isim: 'Zir. Müh. Elif KAYA', rol: 'Sera Kimyasal Denge Danışmanı', tel: '+90 544 444 55 66' },
                { isim: 'Özdemir Yem Sanayi', rol: 'Rasyon & Lojistik Tedarikçi', tel: '+90 224 888 99 00' },
                { isim: 'Tesis Gece Vardiya', rol: 'Acil Durum & Altyapı', tel: '+90 555 777 88 99' },
                { isim: 'İtfaiye', rol: 'Acil', tel: '110' },
                { isim: 'Sağlık / 112', rol: 'Acil', tel: '112' },
              ].map(k => (
                <div key={k.isim} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <div className="text-xs font-medium">{k.isim}</div>
                    <div className="text-xs text-muted-foreground">{k.rol}</div>
                  </div>
                  <a href={`tel:${k.tel}`} className="text-xs font-mono text-blue-500 hover:text-blue-600 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {k.tel}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}