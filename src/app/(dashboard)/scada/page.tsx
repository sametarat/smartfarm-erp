'use client'

import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { cn } from '@/lib/utils'
import { Wifi, WifiOff, Download, RefreshCw, Cpu, Thermometer, Droplets, Zap, AlertTriangle, CheckSquare, Phone } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================
// ESP32 API URL — .env.local'dan gelir
// ============================================================
const ESP32_URL = process.env.NEXT_PUBLIC_ESP32_URL || 'http://192.168.1.100'

async function fetchEsp32Data() {
  const res = await axios.get(`${ESP32_URL}/api/data`, { timeout: 5000 })
  return res.data
}

async function sendCtrl(d: string, v: boolean) {
  const res = await axios.get(`${ESP32_URL}/api/ctrl`, { params: { d, v: v ? '1' : '0' }, timeout: 5000 })
  return res.data
}

// ============================================================
// TYPES
// ============================================================
interface Esp32Data {
  sys: { wifi: boolean; seraSHT: boolean; ahirSHT: boolean; jvs: boolean; auto: boolean; uptime: number; heap: number; ver: string }
  sera: { temp: string; hum: string; ph: string; ec: string; tank: number; pompa: boolean; fan: boolean; led: boolean; isit: boolean }
  ahir: { temp: string; hum: string; amonyak: string; fan: boolean; scraper: boolean; suluk: boolean; yem: boolean; hareket: boolean }
  crm: { yemStoku: number }
}

// ============================================================
// RELAY TOGGLE
// ============================================================
function RelayToggle({ label, device, isOn, onToggle, disabled }: {
  label: string; device: string; isOn: boolean
  onToggle: (d: string, v: boolean) => void; disabled?: boolean
}) {
  return (
    <div className={cn('flex items-center justify-between p-3 rounded-lg border transition-colors',
      isOn ? 'bg-green-500/10 border-green-500/30' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      disabled && 'opacity-40'
    )}>
      <span className="text-sm font-medium">{label}</span>
      <button
        onClick={() => !disabled && onToggle(device, !isOn)}
        disabled={disabled}
        className={cn('relative w-11 h-6 rounded-full transition-colors duration-200',
          isOn ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
          isOn ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}

// ============================================================
// SENSOR CARD
// ============================================================
function SensorCard({ label, value, unit, status }: { label: string; value: string | number; unit: string; status: 'good' | 'warn' | 'bad' }) {
  const colors = { good: 'text-green-500', warn: 'text-yellow-500', bad: 'text-red-500' }
  return (
    <div className="bg-card border border-border rounded-xl p-3 relative">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className={cn('text-2xl font-bold', colors[status])}>{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></div>
      <span className={cn('absolute top-2 right-2 w-1.5 h-1.5 rounded-full animate-pulse', colors[status])} />
    </div>
  )
}

// ============================================================
// STATUS BADGE
// ============================================================
function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
        ok ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
      )}>{ok ? 'BAĞLI' : 'KOPUK'}</span>
    </div>
  )
}

// ============================================================
// CRM GÖREV TİPİ
// ============================================================
interface CrmTask { id: number; text: string; done: boolean }

const DEFAULT_TASKS: CrmTask[] = [
  { id: 1, text: 'Sabah rasyonu yem kalitesini ve mikseri kontrol et.', done: false },
  { id: 2, text: 'Sera pH/EC elektrotlarının saf su temizliğini yap.', done: false },
  { id: 3, text: 'JVS depo radarının fiziksel doğruluğunu gözle kontrol et.', done: false },
]

const REHBER = [
  { isim: 'Vet. Hek. Ahmet YILMAZ', rol: 'Küçükbaş Sağlık & Doğum Sorumlusu', tel: '+90 532 111 22 33' },
  { isim: 'Zir. Müh. Elif KAYA', rol: 'Sera Kimyasal Denge & Reçete Danışmanı', tel: '+90 544 444 55 66' },
  { isim: 'Özdemir Yem Sanayi', rol: 'Rasyon Hammadde ve Lojistik Tedarikçisi', tel: '+90 224 888 99 00' },
  { isim: 'Tesis Gece Vardiya Amiri', rol: 'Acil Durum & Altyapı Saha Sorumlusu', tel: '+90 555 777 88 99' },
]

// ============================================================
// ANA SAYFA
// ============================================================
export default function ScadaPage() {
  const [tab, setTab] = useState<'scada' | 'analiz' | 'crm' | 'rehber'>('scada')
  const [crmTasks, setCrmTasks] = useState<CrmTask[]>(DEFAULT_TASKS)
  const [newTask, setNewTask] = useState('')
  const queryClient = useQueryClient()

  // LocalStorage CRM
  useEffect(() => {
    const saved = localStorage.getItem('cayirkoy_crm')
    if (saved) setCrmTasks(JSON.parse(saved))
  }, [])
  useEffect(() => {
    localStorage.setItem('cayirkoy_crm', JSON.stringify(crmTasks))
  }, [crmTasks])

  // ESP32 veri çekme (3sn)
  const { data, isError, isFetching } = useQuery<Esp32Data>({
    queryKey: ['esp32'],
    queryFn: fetchEsp32Data,
    refetchInterval: 3000,
    retry: 1,
  })

  // Kontrol mutation
  const ctrlMutation = useMutation({
    mutationFn: ({ d, v }: { d: string; v: boolean }) => sendCtrl(d, v),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['esp32'] }),
    onError: () => toast.error('ESP32 bağlantı hatası'),
  })

  const ctrl = useCallback((d: string, v: boolean) => {
    ctrlMutation.mutate({ d, v })
  }, [ctrlMutation])

  const isConnected = !isError && !!data

  // CRM fonksiyonları
  const addTask = () => {
    if (!newTask.trim()) return
    setCrmTasks(prev => [...prev, { id: Date.now(), text: newTask.trim(), done: false }])
    setNewTask('')
  }
  const toggleTask = (id: number) => setCrmTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const deleteTask = (id: number) => setCrmTasks(prev => prev.filter(t => t.id !== id))

  const s = data?.sera
  const a = data?.ahir
  const sys = data?.sys

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium',
            isConnected ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
          )}>
            {isConnected ? <><Wifi className="w-3 h-3" /><span>ESP32 Bağlı</span></> : <><WifiOff className="w-3 h-3" /><span>ESP32 Bağlanamıyor</span></>}
          </div>
          {sys && <span className="text-xs text-muted-foreground">v{sys.ver} | Uptime: {Math.floor(sys.uptime/60)}dk | Heap: {Math.floor(sys.heap/1024)}KB</span>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['esp32'] })}
            className={cn('p-2 rounded-lg hover:bg-accent', isFetching && 'animate-spin')}>
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Sistem modu */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg text-xs">
            <button onClick={() => ctrl('sys_auto', true)}
              className={cn('px-3 py-1 rounded-md font-medium transition-colors',
                sys?.auto ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}>Otomatik</button>
            <button onClick={() => ctrl('sys_auto', false)}
              className={cn('px-3 py-1 rounded-md font-medium transition-colors',
                !sys?.auto ? 'bg-orange-500 text-white shadow-sm' : 'text-muted-foreground'
              )}>Manuel</button>
          </div>
        </div>
      </div>

      {/* Bağlanamıyor uyarısı */}
      {isError && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>ESP32'ye bağlanılamıyor — <code className="font-mono">{ESP32_URL}/api/data</code> adresini kontrol edin.</span>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-full md:w-fit flex-wrap">
        {([['scada','🎛️ SCADA'],['analiz','📊 Analiz'],['crm','📋 CRM'],['rehber','📞 Rehber']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            className={cn('px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              tab === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}>{label}</button>
        ))}
      </div>

      {/* ===== SCADA ===== */}
      {tab === 'scada' && (
        <div className="space-y-4">

          {/* Altyapı durumu */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Cpu className="w-4 h-4" /> Altyapı Sağlık</h3>
            <div className="grid grid-cols-2 gap-x-8">
              <StatusBadge ok={sys?.wifi ?? false} label="WiFi Modülü" />
              <StatusBadge ok={sys?.seraSHT ?? false} label="Sera SHT31 (0x44)" />
              <StatusBadge ok={sys?.ahirSHT ?? false} label="Ahır SHT31 (0x45)" />
              <StatusBadge ok={sys?.jvs ?? false} label="Ultrasonik JVS" />
            </div>
            {data?.crm && (
              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Yem Hammadde Deposu</span>
                <span className={cn('text-sm font-bold', (data.crm.yemStoku < 100) ? 'text-red-500' : 'text-yellow-500')}>
                  {data.crm.yemStoku} kg
                </span>
              </div>
            )}
          </div>

          {/* Sera */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">🌿 Sera Hücresi</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-4">
              <SensorCard label="Sıcaklık" value={s?.temp ?? '--'} unit="°C"
                status={!s ? 'warn' : parseFloat(s.temp)>=15&&parseFloat(s.temp)<=28?'good':'bad'} />
              <SensorCard label="Nem" value={s?.hum ?? '--'} unit="%"
                status={!s ? 'warn' : 'good'} />
              <SensorCard label="pH" value={s?.ph ?? '--'} unit=""
                status={!s ? 'warn' : parseFloat(s.ph)>=5.8&&parseFloat(s.ph)<=6.2?'good':'bad'} />
              <SensorCard label="EC" value={s?.ec ?? '--'} unit="mS/cm"
                status={!s ? 'warn' : parseFloat(s.ec??'0')>=1.0&&parseFloat(s.ec??'0')<=1.4?'good':'warn'} />
              <SensorCard label="Tank" value={s?.tank ?? '--'} unit="%"
                status={!s ? 'warn' : (s.tank>30?'good':s.tank>15?'warn':'bad')} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RelayToggle label="R1 | Sulama Pompası"        device="sera_pompa" isOn={s?.pompa??false} onToggle={ctrl} disabled={sys?.auto} />
              <RelayToggle label="R2 | İklimlendirme Fanı"    device="sera_fan"   isOn={s?.fan??false}   onToggle={ctrl} disabled={sys?.auto} />
              <RelayToggle label="R3 | Fotosentez Aydınlatma" device="sera_led"   isOn={s?.led??false}   onToggle={ctrl} />
              <RelayToggle label="R4 | Ortam Rezistansı"      device="sera_isit"  isOn={s?.isit??false}  onToggle={ctrl} disabled={sys?.auto} />
            </div>
          </div>

          {/* Ahır */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">🐑 Hayvancılık Hücresi</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
              <SensorCard label="Sıcaklık" value={a?.temp ?? '--'} unit="°C" status="good" />
              <SensorCard label="Nem" value={a?.hum ?? '--'} unit="%" status="good" />
              <SensorCard label="Amonyak" value={a?.amonyak ?? '--'} unit="ppm"
                status={!a ? 'warn' : parseInt(a.amonyak)>50?'bad':parseInt(a.amonyak)>25?'warn':'good'} />
              <div className={cn('border rounded-xl p-3', a?.hareket ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-card')}>
                <div className="text-xs text-muted-foreground mb-1">Hareket</div>
                <div className={cn('text-2xl font-bold', a?.hareket ? 'text-yellow-500' : 'text-muted-foreground')}>
                  {a?.hareket ? '🚨 VAR' : '😴 YOK'}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <RelayToggle label="R5 | Egzoz Fanı"           device="ahir_fan"   isOn={a?.fan??false}     onToggle={ctrl} disabled={sys?.auto} />
              <RelayToggle label="R6 | Gübre Sıyırıcı"       device="ahir_scr"   isOn={a?.scraper??false} onToggle={ctrl} />
              <RelayToggle label="R7 | Suluk Solenoid Vana"  device="ahir_suluk" isOn={a?.suluk??false}   onToggle={ctrl} disabled={sys?.auto} />
              <RelayToggle label="R8 | Helezon Yem Motoru"   device="ahir_yem"   isOn={a?.yem??false}     onToggle={ctrl} />
            </div>
          </div>
        </div>
      )}

      {/* ===== ANALİZ ===== */}
      {tab === 'analiz' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">📊 Otomasyon Sağlık</h3>
            {[
              ['Sistem Modu', sys?.auto ? 'OTOMATİK' : 'MANUEL', sys?.auto ? 'good' : 'warn'],
              ['Sera İklim Algoritması', 'NORMAL (AKTİF)', 'good'],
              ['Zehirli Gaz Emniyet Kilidi', parseInt(a?.amonyak??'0')<25 ? 'GÜVENLİ' : 'ALARM', parseInt(a?.amonyak??'0')<25 ? 'good' : 'bad'],
              ['Telegram Alarm Hattı', sys?.wifi ? 'ONLINE' : 'OFFLINE', sys?.wifi ? 'good' : 'bad'],
              ['JVS Radar', sys?.jvs ? 'BAĞLI' : 'KOPUK', sys?.jvs ? 'good' : 'bad'],
            ].map(([label, val, status]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={cn('text-xs font-semibold', status==='good'?'text-green-500':status==='warn'?'text-yellow-500':'text-red-500')}>{val}</span>
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">📉 Limit Raporu</h3>
            {[
              ['Sera Maks Sıcaklık Eşiği', '28.0 °C'],
              ['Ahır Amonyak Alarm Sınırı', '25 ppm'],
              ['Su Deposu Kritik Alt Sınırı', '%15'],
              ['Günlük Ortalama Yem Tüketimi', '30 kg/gün'],
              ['pH Hedef Aralığı', '5.8 – 6.2'],
              ['EC Hedef Aralığı', '1.0 – 1.4 mS/cm'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="text-sm font-semibold">{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== CRM ===== */}
      {tab === 'crm' && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><CheckSquare className="w-4 h-4" /> İş Planı & Günlük Rutin</h3>
          <div className="flex gap-2 mb-4">
            <input
              value={newTask}
              onChange={e => setNewTask(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addTask()}
              placeholder="Yeni görev ekle..."
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-green-500/30"
            />
            <button onClick={addTask} className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg font-medium hover:bg-green-700">
              Ekle
            </button>
          </div>
          <div className="space-y-2">
            {crmTasks.map(task => (
              <div key={task.id} className={cn(
                'flex items-center gap-3 p-3 rounded-lg border-l-4 transition-opacity',
                task.done ? 'border-green-500 opacity-50 line-through' : 'border-yellow-500 bg-muted/50'
              )}>
                <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} className="w-4 h-4 cursor-pointer" />
                <span className="flex-1 text-sm">{task.text}</span>
                <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-500 text-xs px-2 py-1 rounded">🗑️</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== REHBER ===== */}
      {tab === 'rehber' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {REHBER.map(kisi => (
            <div key={kisi.isim} className="bg-card border border-border rounded-xl p-4">
              <div className="font-semibold text-sm">{kisi.isim}</div>
              <div className="text-xs text-muted-foreground mt-0.5 mb-2">{kisi.rol}</div>
              <a href={`tel:${kisi.tel}`} className="flex items-center gap-2 text-blue-500 text-sm font-mono hover:underline">
                <Phone className="w-3.5 h-3.5" />{kisi.tel}
              </a>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
