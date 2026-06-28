'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import {
  AlertTriangle, CheckSquare, DollarSign, Package,
  Wifi, WifiOff, RefreshCw, Droplets, Thermometer,
  Wind, Zap, TrendingUp, TrendingDown
} from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const ESP32_URL = process.env.NEXT_PUBLIC_ESP32_URL || 'http://192.168.1.100'

async function fetchEsp32() {
  const res = await axios.get(`${ESP32_URL}/api/data`, { timeout: 4000 })
  return res.data
}

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [{
      data,
      borderColor: color,
      backgroundColor: color.replace(')', ', 0.1)').replace('rgb', 'rgba'),
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }],
  }
  return (
    <div style={{ height: 40 }}>
      <Line data={chartData} options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
      }} />
    </div>
  )
}

function SensorBox({ label, value, unit, status, icon, history = [] }: any) {
  const colors = { good: 'border-green-500/30 bg-green-500/5', warn: 'border-yellow-500/30 bg-yellow-500/5', bad: 'border-red-500/30 bg-red-500/10' }
  const textColors = { good: 'text-green-600', warn: 'text-yellow-600', bad: 'text-red-500' }
  const chartColors = { good: 'rgb(34,197,94)', warn: 'rgb(234,179,8)', bad: 'rgb(239,68,68)' }
  return (
    <div className={cn('rounded-xl border p-3', colors[status] || colors.good)}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs', textColors[status] || textColors.good)}>{icon}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <div className={cn('w-1.5 h-1.5 rounded-full', status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-pulse')} />
      </div>
      <div className={cn('text-xl font-bold', textColors[status] || textColors.good)}>
        {typeof value === 'number' ? value : value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </div>
      {history.length > 1 && <MiniChart data={history} color={chartColors[status] || chartColors.good} />}
    </div>
  )
}

function RelayBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-all',
      active ? 'bg-green-500/10 border-green-500/30 text-green-600' : 'bg-muted border-border text-muted-foreground'
    )}>
      <div className={cn('w-1.5 h-1.5 rounded-full', active ? 'bg-green-500 animate-pulse' : 'bg-gray-400')} />
      {label}
    </div>
  )
}

export default function DashboardPage() {
  const [now, setNow] = useState(new Date())
  const [tempHistory, setTempHistory] = useState<number[]>([])
  const [humHistory, setHumHistory] = useState<number[]>([])
  const [phHistory, setPhHistory] = useState<number[]>([])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const { data: esp32, isError: esp32Error, isFetching } = useQuery({
    queryKey: ['esp32-dash'],
    queryFn: fetchEsp32,
    refetchInterval: 3000,
    retry: 1,
  })

  useEffect(() => {
    if (!esp32) return
    const temp = parseFloat(esp32?.sera?.temp || '0')
    const hum  = parseFloat(esp32?.sera?.hum  || '0')
    const ph   = parseFloat(esp32?.sera?.ph   || '0')
    if (temp) setTempHistory(h => [...h.slice(-19), temp])
    if (hum)  setHumHistory(h => [...h.slice(-19), hum])
    if (ph)   setPhHistory(h => [...h.slice(-19), ph])
  }, [esp32])

  const { data: animalStats } = useQuery({ queryKey: ['animal-stats-dash'], queryFn: () => api.get('/animals/stats').then(r => r.data), refetchInterval: 60000 })
  const { data: taskStats }   = useQuery({ queryKey: ['task-stats-dash'],   queryFn: () => api.get('/tasks/stats').then(r => r.data),  refetchInterval: 30000 })
  const { data: todayTasks = [] } = useQuery({ queryKey: ['today-tasks'],   queryFn: () => api.get('/tasks/today').then(r => r.data),  refetchInterval: 30000 })
  const { data: finKpi }      = useQuery({ queryKey: ['fin-kpi-dash'],      queryFn: () => api.get('/finance/kpi').then(r => r.data),   refetchInterval: 300000 })
  const { data: stockAlerts = [] } = useQuery({ queryKey: ['stock-alerts-dash'], queryFn: () => api.get('/stock/alerts').then(r => r.data), refetchInterval: 60000 })
  const { data: cropStats }   = useQuery({ queryKey: ['crop-stats-dash'],   queryFn: () => api.get('/farm/crops/stats').then(r => r.data), refetchInterval: 60000 })

  const isConnected = !esp32Error && !!esp32
  const s = {
    temp:    parseFloat(esp32?.sera?.temp   || '0'),
    hum:     parseFloat(esp32?.sera?.hum    || '0'),
    ph:      parseFloat(esp32?.sera?.ph     || '0'),
    ec:      parseFloat(esp32?.sera?.ec     || '0'),
    tank:    esp32?.sera?.tank   || 0,
    ahirTemp:parseFloat(esp32?.ahir?.temp   || '0'),
    ahirHum: parseFloat(esp32?.ahir?.hum    || '0'),
    amonyak: parseFloat(esp32?.ahir?.amonyak|| '0'),
    hareket: esp32?.ahir?.har || false,
  }

  const alarms = [
    ...(s.ph > 6.5 || (s.ph < 5.5 && s.ph > 0) ? [{ msg: `pH anormal: ${s.ph}`, sev: 'warn' }] : []),
    ...(s.tank < 30 && s.tank > 0 ? [{ msg: `Tank düşük: %${s.tank}`, sev: 'warn' }] : []),
    ...(s.amonyak > 25 ? [{ msg: `Amonyak: ${s.amonyak} ppm`, sev: 'crit' }] : []),
    ...(!isConnected ? [{ msg: 'ESP32 bağlı değil', sev: 'warn' }] : []),
    ...((stockAlerts as any[]).length > 0 ? [{ msg: `${(stockAlerts as any[]).length} stok uyarısı`, sev: 'warn' }] : []),
  ]

  return (
    <div className="space-y-4">

      {/* ── Üst bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="text-xs text-muted-foreground">{now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <div className="text-xl font-bold tabular-nums">{now.toLocaleTimeString('tr-TR')}</div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            isConnected ? 'bg-green-500/15 text-green-600' : 'bg-red-500/15 text-red-500'
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConnected ? 'ESP32 Bağlı' : 'ESP32 Yok'}
            {isFetching && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
          </div>
          {isConnected && (
            <div className={cn('px-3 py-1.5 rounded-full text-xs font-medium',
              esp32?.sys?.auto ? 'bg-blue-500/15 text-blue-600' : 'bg-orange-500/15 text-orange-600'
            )}>
              {esp32?.sys?.auto ? '🤖 Oto' : '🔧 Manuel'}
            </div>
          )}
        </div>
      </div>

      {/* ── Alarmlar ── */}
      {alarms.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alarms.map((a, i) => (
            <div key={i} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border',
              a.sev === 'crit' ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-orange-500/10 border-orange-500/30 text-orange-500'
            )}>
              <AlertTriangle className="w-3 h-3" /> {a.msg}
            </div>
          ))}
        </div>
      )}

      {/* ── KPI ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Aylık Gelir',    value: `${(finKpi?.monthlyRevenue || 0).toLocaleString('tr-TR')} ₺`, color: 'text-green-600', icon: <TrendingUp className="w-4 h-4" /> },
          { label: 'Bekleyen Görev', value: taskStats?.pending || 0,            color: 'text-yellow-600', icon: <CheckSquare className="w-4 h-4" /> },
          { label: 'Stok Uyarısı',   value: (stockAlerts as any[]).length,      color: (stockAlerts as any[]).length > 0 ? 'text-red-500' : 'text-green-600', icon: <Package className="w-4 h-4" /> },
          { label: 'Toplam Hasat',   value: `${cropStats?.totalHarvestKg || 0} kg`, color: 'text-blue-600', icon: <DollarSign className="w-4 h-4" /> },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">{k.label}</span>
              <span className={k.color}>{k.icon}</span>
            </div>
            <div className={cn('text-lg font-bold', k.color)}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* ── İKİ SÜTUN: Tarım | Hayvancılık ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ═══ SOL: TARIM / SERA ═══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🌿</span>
            <h2 className="text-sm font-bold">Sera / Tarım</h2>
            {isConnected && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
          </div>

          {/* Sensörler */}
          <div className="grid grid-cols-2 gap-2">
            <SensorBox label="Sıcaklık" value={isConnected ? s.temp : '–'} unit="°C"
              status={!isConnected ? 'warn' : s.temp >= 15 && s.temp <= 28 ? 'good' : 'bad'}
              icon={<Thermometer className="w-3 h-3" />} history={tempHistory} />
            <SensorBox label="Nem" value={isConnected ? s.hum : '–'} unit="%"
              status={!isConnected ? 'warn' : s.hum >= 50 && s.hum <= 85 ? 'good' : 'warn'}
              icon={<Droplets className="w-3 h-3" />} history={humHistory} />
            <SensorBox label="pH" value={isConnected ? s.ph : '–'} unit=""
              status={!isConnected ? 'warn' : s.ph >= 5.8 && s.ph <= 6.2 ? 'good' : 'bad'}
              icon="⚗️" history={phHistory} />
            <SensorBox label="EC" value={isConnected ? s.ec : '–'} unit="mS"
              status={!isConnected ? 'warn' : s.ec >= 1.0 && s.ec <= 1.4 ? 'good' : 'warn'}
              icon="⚡" />
          </div>

          {/* Tank */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Su Deposu</span>
              <span className={cn('text-sm font-bold', s.tank > 30 ? 'text-blue-600' : s.tank > 15 ? 'text-yellow-600' : 'text-red-500')}>
                {isConnected ? `%${s.tank}` : '–'}
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div className={cn('h-3 rounded-full transition-all duration-500',
                s.tank > 30 ? 'bg-blue-500' : s.tank > 15 ? 'bg-yellow-500' : 'bg-red-500'
              )} style={{ width: `${isConnected ? s.tank : 0}%` }} />
            </div>
          </div>

          {/* Sera röleleri */}
          {isConnected && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">Sera Röleleri</div>
              <div className="grid grid-cols-2 gap-1.5">
                <RelayBadge label="💧 Pompa"  active={esp32?.sera?.pompa} />
                <RelayBadge label="💨 Fan"    active={esp32?.sera?.fan} />
                <RelayBadge label="💡 LED"    active={esp32?.sera?.led} />
                <RelayBadge label="🔥 Isıtıcı" active={esp32?.sera?.isit} />
              </div>
            </div>
          )}

          {/* Ürün özeti */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Ürün Durumu</div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg font-bold text-green-600">{cropStats?.growing || 0}</div>
                <div className="text-xs text-muted-foreground">Büyüyor</div>
              </div>
              <div>
                <div className="text-lg font-bold text-yellow-600">{cropStats?.harvested || 0}</div>
                <div className="text-xs text-muted-foreground">Hasat</div>
              </div>
              <div>
                <div className="text-lg font-bold text-blue-600">{cropStats?.totalHarvestKg || 0}</div>
                <div className="text-xs text-muted-foreground">Toplam kg</div>
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SAĞ: HAYVANCILIK / AHIR ═══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-base">🐑</span>
            <h2 className="text-sm font-bold">Ahır / Hayvancılık</h2>
            {isConnected && <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />}
          </div>

          {/* Ahır sensörleri */}
          <div className="grid grid-cols-2 gap-2">
            <SensorBox label="Ahır Sıcaklık" value={isConnected ? s.ahirTemp : '–'} unit="°C"
              status={!isConnected ? 'warn' : s.ahirTemp <= 30 ? 'good' : 'bad'}
              icon={<Thermometer className="w-3 h-3" />} />
            <SensorBox label="Ahır Nem" value={isConnected ? s.ahirHum : '–'} unit="%"
              status={!isConnected ? 'warn' : s.ahirHum <= 80 ? 'good' : 'warn'}
              icon={<Droplets className="w-3 h-3" />} />
            <SensorBox label="Amonyak" value={isConnected ? s.amonyak : '–'} unit="ppm"
              status={!isConnected ? 'warn' : s.amonyak < 25 ? 'good' : s.amonyak < 50 ? 'warn' : 'bad'}
              icon={<Wind className="w-3 h-3" />} />
            <div className={cn('rounded-xl border p-3', s.hareket ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-card')}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Hareket</span>
                <div className={cn('w-1.5 h-1.5 rounded-full', s.hareket ? 'bg-yellow-500 animate-pulse' : 'bg-gray-400')} />
              </div>
              <div className={cn('text-xl font-bold', s.hareket ? 'text-yellow-600' : 'text-muted-foreground')}>
                {s.hareket ? '🚨 VAR' : '😴 Yok'}
              </div>
            </div>
          </div>

          {/* Ahır röleleri */}
          {isConnected && (
            <div className="bg-card border border-border rounded-xl p-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">Ahır Röleleri</div>
              <div className="grid grid-cols-2 gap-1.5">
                <RelayBadge label="💨 Fan"       active={esp32?.ahir?.fan} />
                <RelayBadge label="🔄 Scraper"   active={esp32?.ahir?.scraper} />
                <RelayBadge label="💧 Suluk"     active={esp32?.ahir?.suluk} />
                <RelayBadge label="🌾 Yem Motor" active={esp32?.ahir?.yem} />
              </div>
            </div>
          )}

          {/* Sürü istatistikleri */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">Sürü Durumu</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Toplam', value: animalStats?.total || 0, color: 'text-foreground' },
                { label: 'Sağlıklı', value: animalStats?.healthy || 0, color: 'text-green-600' },
                { label: 'Gebe', value: animalStats?.pregnant || 0, color: 'text-purple-600' },
                { label: 'Hasta', value: animalStats?.sick || 0, color: 'text-red-500' },
              ].map(item => (
                <div key={item.label} className="text-center p-2 bg-muted rounded-lg">
                  <div className={cn('text-xl font-bold', item.color)}>{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bugünkü görevler */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-medium text-muted-foreground">Bugünkü Görevler</div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                (taskStats?.pending || 0) > 0 ? 'bg-yellow-500/15 text-yellow-600' : 'bg-green-500/15 text-green-600'
              )}>
                {taskStats?.pending || 0} bekliyor
              </span>
            </div>
            {(todayTasks as any[]).length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3">Bugün için görev yok ✓</div>
            ) : (
              <div className="space-y-1.5">
                {(todayTasks as any[]).slice(0, 4).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                      t.priority === 'CRITICAL' ? 'bg-red-500' :
                      t.priority === 'HIGH' ? 'bg-orange-500' : 'bg-blue-500'
                    )} />
                    <span className="text-xs flex-1 truncate">{t.title}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t.assignee ? `${t.assignee.name[0]}${t.assignee.surname[0]}` : '–'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}