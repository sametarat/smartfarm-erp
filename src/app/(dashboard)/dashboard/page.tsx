'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  KPICard,
  SensorCard,
  TaskSummary,
  AlarmPanel,
} from '@/components/dashboard'
import { ProductionChart } from '@/components/charts'
import { AlertTriangle, CheckSquare, DollarSign, Package, Zap, Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api/client'

const ESP32_URL = process.env.NEXT_PUBLIC_ESP32_URL || 'http://192.168.1.100'

// ============================================================
// VERİ ÇEKİCİLER
// ============================================================

async function fetchEsp32() {
  const res = await axios.get(`${ESP32_URL}/api/data`, { timeout: 4000 })
  return res.data
}

// ============================================================
// DASHBOARD
// ============================================================

export default function DashboardPage() {
  const [now, setNow] = useState(new Date())

  // Saat güncelle
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // ESP32 canlı veri (3sn)
  const { data: esp32, isError: esp32Error, isFetching: esp32Fetching } = useQuery({
    queryKey: ['esp32-dash'],
    queryFn: fetchEsp32,
    refetchInterval: 3000,
    retry: 1,
  })

  // API verileri
  const { data: taskStats } = useQuery({
    queryKey: ['task-stats-dash'],
    queryFn: () => api.get('/tasks/stats').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: todayTasks = [] } = useQuery({
    queryKey: ['today-tasks-dash'],
    queryFn: () => api.get('/tasks/today').then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: animalStats } = useQuery({
    queryKey: ['animal-stats-dash'],
    queryFn: () => api.get('/animals/stats').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: finKpi } = useQuery({
    queryKey: ['fin-kpi-dash'],
    queryFn: () => api.get('/finance/kpi').then(r => r.data),
    refetchInterval: 300000,
  })

  const { data: stockAlerts = [] } = useQuery({
    queryKey: ['stock-alerts-dash'],
    queryFn: () => api.get('/stock/alerts').then(r => r.data),
    refetchInterval: 60000,
  })

  // Sensör verileri (ESP32 veya fallback)
  const sensors = {
    temperature: parseFloat(esp32?.sera?.temp || '0'),
    humidity:    parseFloat(esp32?.sera?.hum  || '0'),
    ph:          parseFloat(esp32?.sera?.ph   || '0'),
    ec:          parseFloat(esp32?.sera?.ec   || '0'),
    ammonia:     parseFloat(esp32?.ahir?.amonyak || '0'),
    tankLevel:   esp32?.sera?.tank || 0,
  }

  const isEsp32Connected = !esp32Error && !!esp32

  // Alarmlar
  const alarms: any[] = []
  if (sensors.ph > 6.5)      alarms.push({ id: 'ph',  severity: 'warning', message: `pH yüksek (${sensors.ph})`,               device: 'Sera',   timestamp: 'Şimdi', acknowledged: false })
  if (sensors.ph < 5.5 && sensors.ph > 0) alarms.push({ id: 'phl', severity: 'warning', message: `pH düşük (${sensors.ph})`,    device: 'Sera',   timestamp: 'Şimdi', acknowledged: false })
  if (sensors.tankLevel < 30 && sensors.tankLevel > 0) alarms.push({ id: 'tank', severity: 'warning', message: `Tank seviyesi düşük (%${sensors.tankLevel})`, device: 'Sera', timestamp: 'Şimdi', acknowledged: false })
  if (sensors.ammonia > 25)  alarms.push({ id: 'am',  severity: sensors.ammonia > 50 ? 'critical' : 'warning', message: `Amonyak yüksek (${sensors.ammonia} ppm)`, device: 'Ahır', timestamp: 'Şimdi', acknowledged: false })
  if (!isEsp32Connected)     alarms.push({ id: 'esp', severity: 'warning', message: 'ESP32 bağlantısı yok', device: 'Sistem', timestamp: 'Şimdi', acknowledged: false })
  if ((stockAlerts as any[]).length > 0) alarms.push({ id: 'stk', severity: 'warning', message: `${(stockAlerts as any[]).length} stok kalemi minimum seviyede`, device: 'Depo', timestamp: 'Şimdi', acknowledged: false })

  // Görev listesi
  const tasks = (todayTasks as any[]).slice(0, 5).map((t: any) => ({
    id: t.id,
    title: t.title,
    priority: t.priority?.toLowerCase() as any,
    dueDate: t.dueDate ? new Date(t.dueDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : 'Bugün',
    assignee: t.assignee ? `${t.assignee.name} ${t.assignee.surname[0]}.` : 'Atanmamış',
  }))

  // Haftalık üretim (statik + hasat verisiyle güncellenebilir)
  const production = [
    { date: 'Pzt', strawberry: 45, lettuce: 12, basil: 8 },
    { date: 'Sal', strawberry: 52, lettuce: 14, basil: 9 },
    { date: 'Çar', strawberry: 48, lettuce: 11, basil: 7 },
    { date: 'Per', strawberry: 61, lettuce: 15, basil: 10 },
    { date: 'Cum', strawberry: 55, lettuce: 13, basil: 8 },
    { date: 'Cmt', strawberry: 70, lettuce: 16, basil: 11 },
    { date: 'Paz', strawberry: 0,  lettuce: 8,  basil: 5  },
  ]

  return (
    <div className="space-y-5">

      {/* ── Üst bilgi çubuğu ─────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-muted-foreground">
            {now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
          <div className="text-lg font-bold tabular-nums">
            {now.toLocaleTimeString('tr-TR')}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            isEsp32Connected ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'
          )}>
            {isEsp32Connected
              ? <><Wifi className="w-3 h-3" /> ESP32 Bağlı</>
              : <><WifiOff className="w-3 h-3" /> ESP32 Bağlı Değil</>
            }
            {esp32Fetching && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
          </div>
          {esp32?.sys?.auto !== undefined && (
            <div className={cn('px-3 py-1.5 rounded-full text-xs font-medium',
              esp32.sys.auto ? 'bg-blue-500/15 text-blue-600' : 'bg-orange-500/15 text-orange-600'
            )}>
              {esp32.sys.auto ? '🤖 Otomatik' : '🔧 Manuel'}
            </div>
          )}
        </div>
      </div>

      {/* ── Alarmlar ─────────────────────────────────────────── */}
      {alarms.length > 0 && <AlarmPanel alarms={alarms} />}

      {/* ── KPI Kartları ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPICard
          label="Toplam Hayvan"
          value={animalStats?.total ?? '–'}
          unit="baş"
          icon={<span>🐑</span>}
          color="blue"
        />
        <KPICard
          label="Aktif Alarm"
          value={alarms.length}
          icon={<AlertTriangle className="w-4 h-4" />}
          color={alarms.length > 0 ? 'danger' : 'success'}
          urgent={alarms.length > 0}
        />
        <KPICard
          label="Bekleyen Görev"
          value={taskStats?.pending ?? '–'}
          icon={<CheckSquare className="w-4 h-4" />}
          color="warning"
        />
        <KPICard
          label="Aylık Gelir"
          value={finKpi?.monthlyRevenue ?? 0}
          unit="₺"
          icon={<DollarSign className="w-4 h-4" />}
          color="success"
          format="currency"
        />
        <KPICard
          label="Aktif Cihaz"
          value={isEsp32Connected ? (esp32?.sys?.wifi ? 1 : 0) : 0}
          icon={<Zap className="w-4 h-4" />}
          color="blue"
        />
        <KPICard
          label="Stok Uyarısı"
          value={(stockAlerts as any[]).length}
          icon={<Package className="w-4 h-4" />}
          color={(stockAlerts as any[]).length > 0 ? 'warning' : 'success'}
        />
      </div>

      {/* ── Canlı Sensörler ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Canlı Sensörler
          </h2>
          {isEsp32Connected && esp32?.sys?.uptime && (
            <span className="text-xs text-muted-foreground">
              Uptime: {Math.floor(esp32.sys.uptime / 60)} dk
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <SensorCard label="Sıcaklık" value={isEsp32Connected ? sensors.temperature : 0} unit="°C"
            min={15} max={28} decimals={1}
            status={!isEsp32Connected ? 'warn' : sensors.temperature >= 15 && sensors.temperature <= 28 ? 'good' : 'bad'} />
          <SensorCard label="Nem" value={isEsp32Connected ? sensors.humidity : 0} unit="%"
            min={50} max={85}
            status={!isEsp32Connected ? 'warn' : sensors.humidity >= 50 && sensors.humidity <= 85 ? 'good' : 'warn'} />
          <SensorCard label="pH" value={isEsp32Connected ? sensors.ph : 0} unit=""
            min={5.8} max={6.2} decimals={1}
            status={!isEsp32Connected ? 'warn' : sensors.ph >= 5.8 && sensors.ph <= 6.2 ? 'good' : 'bad'} />
          <SensorCard label="EC" value={isEsp32Connected ? sensors.ec : 0} unit="mS/cm"
            min={1.0} max={1.4} decimals={2}
            status={!isEsp32Connected ? 'warn' : sensors.ec >= 1.0 && sensors.ec <= 1.4 ? 'good' : 'warn'} />
          <SensorCard label="Amonyak" value={isEsp32Connected ? sensors.ammonia : 0} unit="ppm"
            min={0} max={25}
            status={!isEsp32Connected ? 'warn' : sensors.ammonia < 25 ? 'good' : sensors.ammonia < 50 ? 'warn' : 'bad'} />
          <SensorCard label="Tank" value={isEsp32Connected ? sensors.tankLevel : 0} unit="%"
            min={15} max={100} showBar
            status={!isEsp32Connected ? 'warn' : sensors.tankLevel > 30 ? 'good' : sensors.tankLevel > 15 ? 'warn' : 'bad'} />
        </div>
      </div>

      {/* ── Röle Durumu (ESP32 bağlıysa) ────────────────────── */}
      {isEsp32Connected && esp32 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-3">Röle Durumları</h3>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
            {[
              { label: 'Sera Pompa', val: esp32.sera?.pompa },
              { label: 'Sera Fan',   val: esp32.sera?.fan },
              { label: 'LED',        val: esp32.sera?.led },
              { label: 'Isıtıcı',   val: esp32.sera?.isit },
              { label: 'Ahır Fan',   val: esp32.ahir?.fan },
              { label: 'Scraper',    val: esp32.ahir?.scraper },
              { label: 'Suluk',      val: esp32.ahir?.suluk },
              { label: 'Yem Motor',  val: esp32.ahir?.yem },
            ].map(r => (
              <div key={r.label} className={cn('rounded-lg p-2 text-center border',
                r.val ? 'bg-green-500/10 border-green-500/30' : 'bg-muted border-border'
              )}>
                <div className={cn('w-2 h-2 rounded-full mx-auto mb-1',
                  r.val ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                )} />
                <div className="text-xs font-medium leading-tight">{r.label}</div>
                <div className={cn('text-xs', r.val ? 'text-green-600' : 'text-muted-foreground')}>
                  {r.val ? 'AÇIK' : 'KAPALI'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grafik + Görevler ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold">Haftalık Üretim (kg)</h3>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Çilek</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />Marul</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Fesleğen</span>
            </div>
          </div>
          <ProductionChart data={production} />
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Bugünkü Görevler</h3>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
              (taskStats?.pending || 0) > 0 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-green-500/15 text-green-600'
            )}>
              {taskStats?.pending ?? 0} bekliyor
            </span>
          </div>
          {tasks.length > 0 ? (
            <TaskSummary tasks={tasks} />
          ) : (
            <div className="text-center text-muted-foreground py-8">
              <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Bugün için görev yok</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Ahır Özeti ───────────────────────────────────────── */}
      {isEsp32Connected && esp32?.ahir && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Ahır Sıcaklık</div>
            <div className={cn('text-xl font-bold', parseFloat(esp32.ahir.temp) > 30 ? 'text-red-500' : 'text-foreground')}>
              {esp32.ahir.temp}°C
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Ahır Nem</div>
            <div className="text-xl font-bold">{esp32.ahir.hum}%</div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1">Amonyak</div>
            <div className={cn('text-xl font-bold', parseFloat(esp32.ahir.amonyak) > 25 ? 'text-red-500' : 'text-green-600')}>
              {esp32.ahir.amonyak} ppm
            </div>
          </div>
          <div className={cn('bg-card border rounded-xl p-3 text-center', esp32.ahir.har ? 'border-yellow-500/50 bg-yellow-500/5' : 'border-border')}>
            <div className="text-xs text-muted-foreground mb-1">Hareket</div>
            <div className={cn('text-xl font-bold', esp32.ahir.har ? 'text-yellow-500' : 'text-muted-foreground')}>
              {esp32.ahir.har ? '🚨 VAR' : '😴 Yok'}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
