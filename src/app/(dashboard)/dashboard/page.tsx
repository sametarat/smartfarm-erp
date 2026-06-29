'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import {
  AlertTriangle, Wifi, WifiOff, RefreshCw,
  TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Thermometer, Droplets, Wind, Activity
} from 'lucide-react'
import { Line, Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Tooltip, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Filler)

const ESP32_URL = process.env.NEXT_PUBLIC_ESP32_URL || 'http://192.168.1.100'

async function fetchEsp32() {
  const res = await axios.get(`${ESP32_URL}/api/data`, { timeout: 4000 })
  return res.data
}

function Sparkline({ data, color, positive }: { data: number[]; color: string; positive?: boolean }) {
  if (data.length < 2) return null
  const chartData = {
    labels: data.map((_, i) => i),
    datasets: [{
      data,
      borderColor: color,
      backgroundColor: color + '18',
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }],
  }
  return (
    <div style={{ height: 36, width: 80 }}>
      <Line data={chartData} options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
      }} />
    </div>
  )
}

function KpiCard({ label, value, unit, delta, deltaLabel, color, icon, sparkData }: any) {
  const isPositive = delta >= 0
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className={cn('text-2xl font-bold tabular-nums', color)}>{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
        </div>
        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', color.replace('text-', 'bg-').replace('600', '100').replace('500', '100'))}>
          <span className={color}>{icon}</span>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {delta !== undefined && (
          <div className={cn('flex items-center gap-1 text-xs font-medium', isPositive ? 'text-green-600' : 'text-red-500')}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(delta)}{typeof delta === 'number' && deltaLabel ? '' : '%'} {deltaLabel || 'geçen aya göre'}
          </div>
        )}
        {sparkData && <Sparkline data={sparkData} color={color.includes('green') ? '#22c55e' : color.includes('blue') ? '#3b82f6' : '#f59e0b'} />}
      </div>
    </div>
  )
}

function SensorGauge({ label, value, unit, min, max, status, icon }: any) {
  const pct = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const barColor = status === 'good' ? '#22c55e' : status === 'warn' ? '#f59e0b' : '#ef4444'
  const textColor = status === 'good' ? 'text-green-600' : status === 'warn' ? 'text-yellow-600' : 'text-red-500'
  return (
    <div className="bg-card border border-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn('text-xs', textColor)}>{icon}</span>
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
        </div>
        <div className={cn('flex items-center gap-1')}>
          <div className={cn('w-1.5 h-1.5 rounded-full', status === 'good' ? 'bg-green-500' : status === 'warn' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500 animate-pulse')} />
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={cn('text-xl font-bold tabular-nums', textColor)}>{typeof value === 'number' ? value.toFixed(value < 10 ? 1 : 0) : value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: barColor }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  )
}

function RelayStatus({ label, active, icon }: { label: string; active: boolean; icon: string }) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all',
      active
        ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400'
        : 'bg-muted border-border text-muted-foreground'
    )}>
      <span>{icon}</span>
      <span className="flex-1">{label}</span>
      <span className={cn('text-[10px] font-semibold', active ? 'text-green-600' : 'text-muted-foreground')}>
        {active ? 'AÇ' : 'KPL'}
      </span>
    </div>
  )
}

export default function DashboardPage() {
  const [now, setNow] = useState(new Date())
  const [tempHist, setTempHist] = useState<number[]>([22, 22.5, 23, 23.5, 24, 24.2])
  const [phHist, setPhHist] = useState<number[]>([6.0, 6.0, 6.1, 6.1, 6.0, 6.1])
  const [revenueHist] = useState([42000, 51000, 48000, 63000, 71000, 85000])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const { data: esp32, isError: esp32Error, isFetching } = useQuery({
    queryKey: ['esp32-dash'], queryFn: fetchEsp32,
    refetchInterval: 3000, retry: 1,
  })

  useEffect(() => {
    if (!esp32) return
    const t = parseFloat(esp32?.sera?.temp || '0')
    const p = parseFloat(esp32?.sera?.ph || '0')
    if (t) setTempHist(h => [...h.slice(-9), t])
    if (p) setPhHist(h => [...h.slice(-9), p])
  }, [esp32])

  const { data: animalStats } = useQuery({ queryKey: ['as'], queryFn: () => api.get('/animals/stats').then(r => r.data), refetchInterval: 300000 })
  const { data: taskStats }   = useQuery({ queryKey: ['ts'], queryFn: () => api.get('/tasks/stats').then(r => r.data),  refetchInterval: 60000 })
  const { data: todayTasks = [] } = useQuery({ queryKey: ['tt'], queryFn: () => api.get('/tasks/today').then(r => r.data), refetchInterval: 60000 })
  const { data: finKpi }      = useQuery({ queryKey: ['fk'], queryFn: () => api.get('/finance/kpi').then(r => r.data),  refetchInterval: 300000 })
  const { data: stockAlerts = [] } = useQuery({ queryKey: ['sa'], queryFn: () => api.get('/stock/alerts').then(r => r.data), refetchInterval: 300000 })
  const { data: cropStats }   = useQuery({ queryKey: ['cs'], queryFn: () => api.get('/farm/crops/stats').then(r => r.data), refetchInterval: 300000 })

  const isConn = !esp32Error && !!esp32
  const s = {
    temp:     parseFloat(esp32?.sera?.temp    || '0'),
    hum:      parseFloat(esp32?.sera?.hum     || '0'),
    ph:       parseFloat(esp32?.sera?.ph      || '0'),
    ec:       parseFloat(esp32?.sera?.ec      || '0'),
    tank:     esp32?.sera?.tank  || 0,
    ahirTemp: parseFloat(esp32?.ahir?.temp    || '0'),
    ahirHum:  parseFloat(esp32?.ahir?.hum     || '0'),
    amonyak:  parseFloat(esp32?.ahir?.amonyak || '0'),
    hareket:  esp32?.ahir?.har || false,
  }

  const alarms = [
    ...((s.ph > 6.5 || (s.ph < 5.5 && s.ph > 0)) ? [`pH anormal: ${s.ph}`] : []),
    ...(s.tank < 30 && s.tank > 0 ? [`Tank düşük: %${s.tank}`] : []),
    ...(s.amonyak > 25 ? [`Amonyak yüksek: ${s.amonyak} ppm`] : []),
    ...(!isConn ? ['ESP32 bağlantısı yok'] : []),
    ...((stockAlerts as any[]).length > 0 ? [`${(stockAlerts as any[]).length} stok kalemi kritik seviyede`] : []),
  ]

  const productionChart = {
    labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
    datasets: [
      { label: 'Çilek', data: [45, 52, 48, 61, 55, 70, 0], backgroundColor: '#ef4444', borderRadius: 3 },
      { label: 'Marul', data: [12, 14, 11, 15, 13, 16, 8], backgroundColor: '#22c55e', borderRadius: 3 },
    ],
  }

  return (
    <div className="space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div className="text-2xl font-bold tabular-nums tracking-tight">{now.toLocaleTimeString('tr-TR')}</div>
        </div>
        <div className="flex items-center gap-2">
          {alarms.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-xs font-medium text-red-500">
              <AlertTriangle className="w-3 h-3" /> {alarms.length} alarm
            </div>
          )}
          <div className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border',
            isConn ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-muted border-border text-muted-foreground'
          )}>
            {isConn ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {isConn ? 'ESP32 Bağlı' : 'ESP32 Yok'}
            {isFetching && <RefreshCw className="w-3 h-3 animate-spin ml-1" />}
          </div>
          {isConn && (
            <div className={cn('px-3 py-1.5 rounded-full text-xs font-medium border',
              esp32?.sys?.auto ? 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-orange-500/10 border-orange-500/20 text-orange-600'
            )}>
              {esp32?.sys?.auto ? '🤖 Oto' : '🔧 Manuel'}
            </div>
          )}
        </div>
      </div>

      {/* ── Alarmlar ── */}
      {alarms.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-semibold text-red-500">Aktif Alarmlar</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {alarms.map((a, i) => (
              <span key={i} className="text-xs px-2.5 py-1 bg-red-500/10 text-red-600 rounded-full border border-red-500/20">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── KPI Kartları ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Aylık Gelir" value={(finKpi?.monthlyRevenue || 0).toLocaleString('tr-TR')} unit="₺"
          delta={finKpi?.revenueGrowth || 0} color="text-green-600"
          icon={<TrendingUp className="w-4 h-4" />} sparkData={revenueHist} />
        <KpiCard label="Toplam Hayvan" value={animalStats?.total || 0} unit="baş"
          color="text-blue-600" icon={<span className="text-base">🐑</span>} />
        <KpiCard label="Bekleyen Görev" value={taskStats?.pending || 0} unit="adet"
          color="text-yellow-600" icon={<Activity className="w-4 h-4" />} />
        <KpiCard label="Toplam Hasat" value={cropStats?.totalHarvestKg || 0} unit="kg"
          color="text-purple-600" icon={<span className="text-base">🌾</span>} />
      </div>

      {/* ── İKİ SÜTUN ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* SOL: SERA */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-4 bg-green-500 rounded-full" />
            <h2 className="text-sm font-bold tracking-tight">Sera / Tarım</h2>
            {isConn && <span className="text-xs text-muted-foreground ml-auto">3sn güncelleme</span>}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SensorGauge label="Sıcaklık" value={isConn ? s.temp : 0} unit="°C" min={15} max={32}
              status={!isConn ? 'warn' : s.temp >= 15 && s.temp <= 28 ? 'good' : 'bad'}
              icon={<Thermometer className="w-3 h-3" />} />
            <SensorGauge label="Nem" value={isConn ? s.hum : 0} unit="%" min={40} max={90}
              status={!isConn ? 'warn' : s.hum >= 50 && s.hum <= 85 ? 'good' : 'warn'}
              icon={<Droplets className="w-3 h-3" />} />
            <SensorGauge label="pH" value={isConn ? s.ph : 0} unit="" min={5} max={7.5}
              status={!isConn ? 'warn' : s.ph >= 5.8 && s.ph <= 6.2 ? 'good' : 'bad'}
              icon={<span>⚗️</span>} />
            <SensorGauge label="EC" value={isConn ? s.ec : 0} unit="mS/cm" min={0.5} max={2.5}
              status={!isConn ? 'warn' : s.ec >= 1.0 && s.ec <= 1.4 ? 'good' : 'warn'}
              icon={<span>⚡</span>} />
          </div>

          {/* Tank */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Su Deposu</span>
              <span className={cn('text-sm font-bold tabular-nums',
                s.tank > 50 ? 'text-blue-600' : s.tank > 30 ? 'text-yellow-600' : 'text-red-500'
              )}>%{isConn ? s.tank : '–'}</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${isConn ? s.tank : 0}%`, background: s.tank > 50 ? '#3b82f6' : s.tank > 30 ? '#f59e0b' : '#ef4444' }} />
            </div>
          </div>

          {/* Sera röleleri */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Sera Kontrol</div>
            <div className="grid grid-cols-2 gap-1.5">
              <RelayStatus label="Sulama Pompası" active={isConn && esp32?.sera?.pompa} icon="💧" />
              <RelayStatus label="Havalandırma" active={isConn && esp32?.sera?.fan} icon="💨" />
              <RelayStatus label="Aydınlatma" active={isConn && esp32?.sera?.led} icon="💡" />
              <RelayStatus label="Isıtma" active={isConn && esp32?.sera?.isit} icon="🔥" />
            </div>
          </div>

          {/* Haftalık üretim */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Haftalık Üretim (kg)</div>
            <div style={{ height: 130 }}>
              <Bar data={productionChart} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: true } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                  y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 } } },
                },
              }} />
            </div>
            <div className="flex gap-3 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded bg-red-400" /> Çilek
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <div className="w-2 h-2 rounded bg-green-500" /> Marul
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: AHIR */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <div className="w-2 h-4 bg-orange-500 rounded-full" />
            <h2 className="text-sm font-bold tracking-tight">Ahır / Hayvancılık</h2>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SensorGauge label="Ahır Sıcaklık" value={isConn ? s.ahirTemp : 0} unit="°C" min={5} max={35}
              status={!isConn ? 'warn' : s.ahirTemp <= 28 ? 'good' : 'bad'}
              icon={<Thermometer className="w-3 h-3" />} />
            <SensorGauge label="Ahır Nem" value={isConn ? s.ahirHum : 0} unit="%" min={30} max={90}
              status={!isConn ? 'warn' : s.ahirHum <= 80 ? 'good' : 'warn'}
              icon={<Droplets className="w-3 h-3" />} />
            <SensorGauge label="Amonyak" value={isConn ? s.amonyak : 0} unit="ppm" min={0} max={60}
              status={!isConn ? 'warn' : s.amonyak < 25 ? 'good' : s.amonyak < 50 ? 'warn' : 'bad'}
              icon={<Wind className="w-3 h-3" />} />
            <div className={cn('bg-card border rounded-xl p-3', s.hareket && isConn ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border')}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Hareket Sensörü</span>
                <div className={cn('w-1.5 h-1.5 rounded-full', s.hareket && isConn ? 'bg-yellow-500 animate-pulse' : 'bg-muted-foreground')} />
              </div>
              <div className={cn('text-xl font-bold', s.hareket && isConn ? 'text-yellow-600' : 'text-muted-foreground')}>
                {s.hareket && isConn ? 'HAREKET' : 'Sakin'}
              </div>
            </div>
          </div>

          {/* Ahır röleleri */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Ahır Kontrol</div>
            <div className="grid grid-cols-2 gap-1.5">
              <RelayStatus label="Havalandırma" active={isConn && esp32?.ahir?.fan} icon="💨" />
              <RelayStatus label="Gübre Scraper" active={isConn && esp32?.ahir?.scraper} icon="🔄" />
              <RelayStatus label="Su Yalağı" active={isConn && esp32?.ahir?.suluk} icon="💧" />
              <RelayStatus label="Yem Motoru" active={isConn && esp32?.ahir?.yem} icon="🌾" />
            </div>
          </div>

          {/* Sürü */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Sürü Durumu</div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: 'Toplam', value: animalStats?.total || 0, color: 'text-foreground' },
                { label: 'Sağlıklı', value: animalStats?.healthy || 0, color: 'text-green-600' },
                { label: 'Gebe', value: animalStats?.pregnant || 0, color: 'text-purple-600' },
                { label: 'Hasta', value: animalStats?.sick || 0, color: 'text-red-500' },
              ].map(item => (
                <div key={item.label} className="p-2 bg-muted rounded-lg">
                  <div className={cn('text-xl font-bold tabular-nums', item.color)}>{item.value}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
            {animalStats?.total > 0 && (
              <div className="mt-3">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                  <div className="bg-green-500 transition-all" style={{ width: `${(animalStats.healthy / animalStats.total) * 100}%` }} />
                  <div className="bg-purple-500 transition-all" style={{ width: `${(animalStats.pregnant / animalStats.total) * 100}%` }} />
                  <div className="bg-red-500 transition-all" style={{ width: `${(animalStats.sick / animalStats.total) * 100}%` }} />
                </div>
              </div>
            )}
          </div>

          {/* Görevler */}
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bugünkü Görevler</div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                (taskStats?.pending || 0) > 0 ? 'bg-yellow-500/15 text-yellow-700' : 'bg-green-500/15 text-green-700'
              )}>
                {taskStats?.pending || 0} bekliyor
              </span>
            </div>
            {(todayTasks as any[]).length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">Bugün tüm görevler tamamlandı ✓</div>
            ) : (
              <div className="space-y-1.5">
                {(todayTasks as any[]).slice(0, 4).map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2.5 p-2 bg-muted/60 rounded-lg">
                    <div className={cn('w-1.5 h-1.5 rounded-full shrink-0',
                      t.priority === 'CRITICAL' ? 'bg-red-500' :
                      t.priority === 'HIGH' ? 'bg-orange-500' :
                      t.priority === 'MEDIUM' ? 'bg-blue-500' : 'bg-gray-400'
                    )} />
                    <span className="text-xs flex-1 truncate">{t.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
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
