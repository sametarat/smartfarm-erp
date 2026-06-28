// ============================================================
// SmartFarm ERP — Chart Bileşenleri
// Chart.js + react-chartjs-2 | Dark mode aware
// ============================================================

'use client'

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler,
  ChartData, ChartOptions
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import { useTheme } from 'next-themes'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, Title, Tooltip, Legend, Filler
)

// ============================================================
// PRODUCTION CHART (Bar)
// ============================================================

interface ProductionChartProps {
  data: { date: string; strawberry: number; lettuce: number; basil: number }[]
}

export function ProductionChart({ data }: ProductionChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'
  const textColor = isDark ? '#9CA3AF' : '#6B7280'

  const chartData: ChartData<'bar'> = {
    labels: data.map(d => d.date),
    datasets: [
      {
        label: 'Çilek (kg)',
        data: data.map(d => d.strawberry),
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderColor: '#EF4444',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Marul (kg)',
        data: data.map(d => d.lettuce),
        backgroundColor: 'rgba(59,130,246,0.7)',
        borderColor: '#3B82F6',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Fesleğen (kg)',
        data: data.map(d => d.basil),
        backgroundColor: 'rgba(245,158,11,0.7)',
        borderColor: '#F59E0B',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  }

  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          font: { size: 11 },
          boxWidth: 12,
          padding: 12,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        titleColor: isDark ? '#F9FAFB' : '#111827',
        bodyColor: isDark ? '#D1D5DB' : '#374151',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        borderWidth: 1,
        padding: 10,
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 11 } },
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 11 } },
        beginAtZero: true,
      },
    },
  }

  return (
    <div style={{ height: '220px' }}>
      <Bar data={chartData} options={options} />
    </div>
  )
}

// ============================================================
// TREND CHART (Line) — SCADA
// ============================================================

interface TrendChartProps {
  data: Record<string, any>[]
  lines: { key: string; label: string; color: string }[]
  height?: number
}

export function TrendChart({ data, lines, height = 200 }: TrendChartProps) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
  const textColor = isDark ? '#9CA3AF' : '#6B7280'

  const chartData: ChartData<'line'> = {
    labels: data.map(d => d.time),
    datasets: lines.map(line => ({
      label: line.label,
      data: data.map(d => d[line.key]),
      borderColor: line.color,
      backgroundColor: `${line.color}20`,
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.4,
      fill: false,
    })),
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          font: { size: 11 },
          boxWidth: 12,
          padding: 10,
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
        titleColor: isDark ? '#F9FAFB' : '#111827',
        bodyColor: isDark ? '#D1D5DB' : '#374151',
        borderColor: isDark ? '#374151' : '#E5E7EB',
        borderWidth: 1,
        padding: 8,
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { size: 10 },
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: textColor, font: { size: 10 } },
      },
    },
  }

  return (
    <div style={{ height: `${height}px` }}>
      <Line data={chartData} options={options} />
    </div>
  )
}

// ============================================================
// MINI SPARKLINE
// ============================================================

export function Sparkline({ values, color = '#22C55E' }: { values: number[]; color?: string }) {
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const chartData: ChartData<'line'> = {
    labels: values.map((_, i) => String(i)),
    datasets: [{
      data: values,
      borderColor: color,
      backgroundColor: `${color}20`,
      borderWidth: 1.5,
      pointRadius: 0,
      tension: 0.4,
      fill: true,
    }],
  }

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    elements: { point: { radius: 0 } },
  }

  return (
    <div style={{ height: '40px', width: '80px' }}>
      <Line data={chartData} options={options} />
    </div>
  )
}
