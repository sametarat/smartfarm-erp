// ============================================================
// SmartFarm ERP — Core UI Bileşenleri
// KPICard, SensorCard, RelayControl, SensorGauge, DeviceStatus
// ============================================================

'use client'

import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown } from 'lucide-react'

// ============================================================
// KPI CARD
// ============================================================

interface KPICardProps {
  label: string
  value: number | string
  unit?: string
  icon?: React.ReactNode
  trend?: { value: number; label: string }
  color?: 'success' | 'warning' | 'danger' | 'blue' | 'default'
  urgent?: boolean
  format?: 'number' | 'currency'
}

export function KPICard({ label, value, unit, icon, trend, color = 'default', urgent, format }: KPICardProps) {
  const colorMap = {
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    danger: 'text-danger bg-danger/10',
    blue: 'text-info bg-info/10',
    default: 'text-muted-foreground bg-muted',
  }

  const displayValue = format === 'currency'
    ? new Intl.NumberFormat('tr-TR').format(Number(value))
    : value

  return (
    <div className={cn(
      'bg-card border border-border rounded-xl p-3 card-hover',
      urgent && 'border-danger/50 animate-pulse-slow'
    )}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        {icon && (
          <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0', colorMap[color])}>
            {icon}
          </div>
        )}
      </div>
      <div className="flex items-end gap-1">
        <span className={cn('text-xl font-bold', urgent && 'text-danger')}>
          {displayValue}
        </span>
        {unit && <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>}
      </div>
      {trend && (
        <div className={cn(
          'flex items-center gap-1 mt-1 text-xs',
          trend.value > 0 ? 'text-success' : trend.value < 0 ? 'text-danger' : 'text-muted-foreground'
        )}>
          {trend.value > 0 ? <TrendingUp className="w-3 h-3" /> : trend.value < 0 ? <TrendingDown className="w-3 h-3" /> : null}
          <span>{Math.abs(trend.value)}% {trend.label}</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SENSOR CARD
// ============================================================

interface SensorCardProps {
  label: string
  value: number
  unit: string
  icon?: React.ReactNode
  min: number
  max: number
  status: 'good' | 'warn' | 'bad'
  decimals?: number
  showBar?: boolean
}

export function SensorCard({ label, value, unit, icon, min, max, status, decimals = 0, showBar }: SensorCardProps) {
  const statusColors = {
    good: 'text-success border-success/30 bg-success/5',
    warn: 'text-warning border-warning/30 bg-warning/5',
    bad: 'text-danger border-danger/30 bg-danger/5',
  }

  const barColor = { good: 'bg-success', warn: 'bg-warning', bad: 'bg-danger' }
  const barWidth = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))

  return (
    <div className={cn('border rounded-xl p-3 relative overflow-hidden', statusColors[status])}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium opacity-80">{label}</span>
        {icon && <span className="opacity-60">{icon}</span>}
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-bold">
          {value.toFixed(decimals)}
        </span>
        {unit && <span className="text-xs opacity-70 mb-0.5">{unit}</span>}
      </div>
      {showBar && (
        <div className="mt-2 h-1.5 bg-current/20 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', barColor[status])}
            style={{ width: `${barWidth}%` }}
          />
        </div>
      )}
      {/* Live indicator */}
      <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
    </div>
  )
}

// ============================================================
// SENSOR GAUGE (SCADA)
// ============================================================

interface SensorGaugeProps {
  label: string
  value: number
  unit: string
  min: number
  max: number
  ideal: [number, number]
  decimals?: number
  showBar?: boolean
  dangerAt?: number
}

export function SensorGauge({ label, value, unit, min, max, ideal, decimals = 0, showBar, dangerAt }: SensorGaugeProps) {
  const isGood = value >= ideal[0] && value <= ideal[1]
  const isDanger = dangerAt ? value >= dangerAt : false
  const isWarn = !isGood && !isDanger

  const status = isDanger ? 'bad' : isGood ? 'good' : 'warn'
  const statusLabel = isDanger ? 'KRİTİK' : isGood ? 'Normal' : 'Uyarı'

  const barWidth = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
  const barColor = { good: '#22C55E', warn: '#F59E0B', bad: '#EF4444' }

  return (
    <div className="bg-card border border-border rounded-xl p-4 card-hover">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <span className={cn(
          'text-xs font-semibold px-2 py-0.5 rounded-full',
          status === 'good' ? 'bg-success/15 text-success' :
          status === 'warn' ? 'bg-warning/15 text-warning' :
          'bg-danger/15 text-danger'
        )}>
          {statusLabel}
        </span>
      </div>

      <div className="flex items-end gap-1 mb-3">
        <span className={cn(
          'text-3xl font-bold',
          status === 'good' ? 'text-success' :
          status === 'warn' ? 'text-warning' : 'text-danger'
        )}>
          {value.toFixed(decimals)}
        </span>
        {unit && <span className="text-sm text-muted-foreground mb-1">{unit}</span>}
      </div>

      {/* Progress bar */}
      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
        {/* Ideal range indicator */}
        <div
          className="absolute h-full bg-success/20 rounded-full"
          style={{
            left: `${((ideal[0] - min) / (max - min)) * 100}%`,
            width: `${((ideal[1] - ideal[0]) / (max - min)) * 100}%`,
          }}
        />
        {/* Current value */}
        <div
          className="absolute h-full rounded-full transition-all duration-500"
          style={{ width: `${barWidth}%`, backgroundColor: barColor[status] }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-muted-foreground">
        <span>{min}</span>
        <span className="text-xs text-muted-foreground/60">İdeal: {ideal[0]}–{ideal[1]}</span>
        <span>{max}</span>
      </div>
    </div>
  )
}

// ============================================================
// RELAY CONTROL
// ============================================================

interface RelayControlProps {
  label: string
  device: string
  isOn: boolean
  onToggle: (device: string, state: boolean) => void
  disabled?: boolean
}

export function RelayControl({ label, device, isOn, onToggle, disabled }: RelayControlProps) {
  return (
    <div className={cn(
      'flex items-center justify-between p-3 rounded-lg border transition-colors',
      isOn ? 'bg-success/10 border-success/30' : 'bg-muted/50 border-border',
      disabled && 'opacity-50 cursor-not-allowed'
    )}>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className={cn('text-xs', isOn ? 'text-success' : 'text-muted-foreground')}>
          {disabled ? 'Otomatik' : isOn ? 'Açık' : 'Kapalı'}
        </div>
      </div>
      <button
        onClick={() => !disabled && onToggle(device, !isOn)}
        disabled={disabled}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors duration-200',
          isOn ? 'bg-success' : 'bg-muted',
          disabled ? 'cursor-not-allowed' : 'cursor-pointer'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200',
          isOn ? 'translate-x-5' : 'translate-x-0.5'
        )} />
      </button>
    </div>
  )
}

// ============================================================
// DEVICE STATUS
// ============================================================

interface DeviceStatusProps {
  device: {
    id: string; name: string; mac: string; type: string
    isOnline: boolean; rssi: number; firmwareVer: string; lastSeen: string
  }
}

export function DeviceStatus({ device }: DeviceStatusProps) {
  const signalStrength = device.rssi >= -60 ? 'Mükemmel' : device.rssi >= -70 ? 'İyi' : device.rssi >= -80 ? 'Zayıf' : 'Çok Zayıf'
  const signalColor = device.rssi >= -60 ? 'text-success' : device.rssi >= -70 ? 'text-info' : device.rssi >= -80 ? 'text-warning' : 'text-danger'

  return (
    <div className={cn(
      'bg-card border rounded-xl p-4',
      device.isOnline ? 'border-success/30' : 'border-danger/30'
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-2 h-2 rounded-full',
            device.isOnline ? 'bg-success animate-pulse' : 'bg-danger'
          )} />
          <span className="text-sm font-semibold">{device.name}</span>
        </div>
        <span className={cn(
          'text-xs px-2 py-0.5 rounded-full font-medium',
          device.isOnline ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
        )}>
          {device.isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">MAC</span>
          <span className="font-mono">{device.mac}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Firmware</span>
          <span>{device.firmwareVer}</span>
        </div>
        {device.isOnline && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sinyal</span>
            <span className={signalColor}>{device.rssi} dBm ({signalStrength})</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-muted-foreground">Son görülme</span>
          <span>{device.lastSeen}</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// ALARM PANEL
// ============================================================

export function AlarmPanel({ alarms }: { alarms: any[] }) {
  const criticals = alarms.filter(a => a.severity === 'critical' && !a.acknowledged)
  const warnings = alarms.filter(a => a.severity === 'warning' && !a.acknowledged)

  return (
    <div className="space-y-2">
      {criticals.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm alarm-critical">
          🚨 <span className="font-semibold">{a.message}</span>
          <span className="ml-auto text-xs opacity-70">{a.device} · {a.timestamp}</span>
        </div>
      ))}
      {warnings.map(a => (
        <div key={a.id} className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-warning/10 border border-warning/30 text-warning text-sm">
          ⚠️ <span>{a.message}</span>
          <span className="ml-auto text-xs opacity-70">{a.device} · {a.timestamp}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// TASK SUMMARY
// ============================================================

export function TaskSummary({ tasks }: { tasks: any[] }) {
  const priorityColors: Record<string, string> = {
    critical: 'bg-danger/15 text-danger border-danger/30',
    high: 'bg-warning/15 text-warning border-warning/30',
    medium: 'bg-info/15 text-info border-info/30',
    low: 'bg-muted text-muted-foreground border-border',
  }
  const priorityLabel: Record<string, string> = {
    critical: 'Kritik', high: 'Yüksek', medium: 'Orta', low: 'Düşük'
  }

  return (
    <div className="space-y-2">
      {tasks.map(task => (
        <div key={task.id} className="flex items-start gap-2 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
          <input type="checkbox" className="mt-0.5 w-3.5 h-3.5 rounded shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{task.title}</div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={cn('text-xs px-1.5 py-0.5 rounded border', priorityColors[task.priority])}>
                {priorityLabel[task.priority]}
              </span>
              <span className="text-xs text-muted-foreground">{task.dueDate}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
