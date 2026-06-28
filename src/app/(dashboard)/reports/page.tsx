'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Bar, Line, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  LineElement, PointElement, ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { FileText, Download } from 'lucide-react'
import { useState } from 'react'
import * as XLSX from 'xlsx'

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler)

const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<'ozet' | 'uretim' | 'hayvan' | 'finans'>('ozet')
  const year = new Date().getFullYear()

  const { data: finYearly } = useQuery({
    queryKey: ['fin-yearly', year],
    queryFn: () => api.get('/finance/yearly', { params: { year } }).then(r => r.data),
  })

  const { data: taskStats } = useQuery({
    queryKey: ['task-stats'],
    queryFn: () => api.get('/tasks/stats').then(r => r.data),
  })

  const { data: animalStats } = useQuery({
    queryKey: ['animal-stats'],
    queryFn: () => api.get('/animals/stats').then(r => r.data),
  })

  const { data: cropStats } = useQuery({
    queryKey: ['crop-stats-report'],
    queryFn: () => api.get('/farm/crops/stats').then(r => r.data),
  })

  const { data: stockAlerts } = useQuery({
    queryKey: ['stock-alerts-report'],
    queryFn: () => api.get('/stock/alerts').then(r => r.data),
  })

  const { data: finKpi } = useQuery({
    queryKey: ['fin-kpi'],
    queryFn: () => api.get('/finance/kpi').then(r => r.data),
  })

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-report'],
    queryFn: () => api.get('/animals').then(r => r.data),
    enabled: activeTab === 'hayvan',
  })

  const { data: crops = [] } = useQuery({
    queryKey: ['crops-report'],
    queryFn: () => api.get('/farm/crops').then(r => r.data),
    enabled: activeTab === 'uretim',
  })

  const { data: transactions } = useQuery({
    queryKey: ['transactions-report'],
    queryFn: () => api.get('/finance/transactions', { params: { limit: 100 } }).then(r => r.data),
    enabled: activeTab === 'finans',
  })

  // Yıllık finans grafiği
  const finChart = {
    labels: MONTHS,
    datasets: [
      { label: 'Gelir', data: finYearly?.months?.map((m: any) => m.income) || [], backgroundColor: 'rgba(34,197,94,0.7)', borderRadius: 4 },
      { label: 'Gider', data: finYearly?.months?.map((m: any) => m.expense) || [], backgroundColor: 'rgba(239,68,68,0.7)', borderRadius: 4 },
    ],
  }

  // Hayvan durum grafiği
  const animalChart = {
    labels: ['Sağlıklı', 'Gebe', 'Hasta', 'Diğer'],
    datasets: [{
      data: [
        animalStats?.healthy || 0, animalStats?.pregnant || 0,
        animalStats?.sick || 0,
        Math.max(0, (animalStats?.total || 0) - (animalStats?.healthy || 0) - (animalStats?.pregnant || 0) - (animalStats?.sick || 0))
      ],
      backgroundColor: ['#22C55E','#A855F7','#EF4444','#94A3B8'],
      borderWidth: 0,
    }],
  }

  const exportExcel = () => {
    const wb = XLSX.utils.book_new()

    // Finans özeti
    if (finYearly) {
      const finData = [
        ['Ay', 'Gelir (₺)', 'Gider (₺)', 'Net Kar (₺)'],
        ...finYearly.months.map((m: any) => [MONTHS[m.month-1], m.income, m.expense, m.profit]),
        ['TOPLAM', finYearly.totalIncome, finYearly.totalExpense, finYearly.totalProfit],
      ]
      const ws = XLSX.utils.aoa_to_sheet(finData)
      XLSX.utils.book_append_sheet(wb, ws, 'Finans')
    }

    // Hayvan listesi
    if ((animals as any[]).length > 0) {
      const animalData = [
        ['Küpe No', 'İsim', 'Irk', 'Cinsiyet', 'Durum', 'Ağırlık (kg)'],
        ...(animals as any[]).map((a: any) => [a.earTag, a.name || '', a.breed, a.gender === 'FEMALE' ? 'Dişi' : 'Erkek', a.status, a.weight || '']),
      ]
      const ws = XLSX.utils.aoa_to_sheet(animalData)
      XLSX.utils.book_append_sheet(wb, ws, 'Hayvanlar')
    }

    XLSX.writeFile(wb, `smartfarm_rapor_${year}.xlsx`)
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: { x: { grid: { display: false } }, y: { ticks: { callback: (v: any) => `${(v/1000).toFixed(0)}K` } } },
  }

  const doughnutOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'right' as const } },
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted p-1 rounded-lg">
          {([['ozet','📊 Özet'],['finans','💰 Finans'],['uretim','🌱 Üretim'],['hayvan','🐑 Hayvancılık']] as const).map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}>{label}</button>
          ))}
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-2 px-3 py-2 border border-border text-sm rounded-lg hover:bg-accent">
          <Download className="w-4 h-4" /> Excel İndir
        </button>
      </div>

      {/* ===== ÖZET ===== */}
      {activeTab === 'ozet' && (
        <div className="space-y-4">
          {/* KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Hayvan', value: animalStats?.total || 0, unit: 'baş', color: 'text-blue-600' },
              { label: 'Aylık Gelir', value: (finKpi?.monthlyRevenue || 0).toLocaleString('tr-TR'), unit: '₺', color: 'text-green-600' },
              { label: 'Bekleyen Görev', value: taskStats?.pending || 0, unit: 'adet', color: 'text-yellow-600' },
              { label: 'Stok Uyarısı', value: (stockAlerts as any[])?.length || 0, unit: 'kalem', color: (stockAlerts as any[])?.length > 0 ? 'text-red-500' : 'text-green-600' },
            ].map(k => (
              <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className={cn('text-2xl font-bold', k.color)}>{k.value}</div>
                <div className="text-xs text-muted-foreground">{k.unit}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          {/* Finans + Hayvan grafikleri */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">{year} Gelir/Gider</h3>
              <div style={{ height: 200 }}>
                <Bar data={finChart} options={chartOptions} />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Sürü Durumu</h3>
              <div style={{ height: 200 }}>
                <Doughnut data={animalChart} options={doughnutOptions} />
              </div>
            </div>
          </div>

          {/* Görev özeti */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Görev Özeti</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Toplam', value: taskStats?.total || 0, color: 'text-foreground' },
                { label: 'Bekleyen', value: taskStats?.pending || 0, color: 'text-yellow-600' },
                { label: 'Bugün Tamamlanan', value: taskStats?.completed || 0, color: 'text-green-600' },
              ].map(t => (
                <div key={t.label} className="text-center p-3 bg-muted rounded-lg">
                  <div className={cn('text-xl font-bold', t.color)}>{t.value}</div>
                  <div className="text-xs text-muted-foreground">{t.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== FİNANS ===== */}
      {activeTab === 'finans' && (
        <div className="space-y-4">
          {/* Yıllık özet */}
          {finYearly && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Yıllık Gelir', value: finYearly.totalIncome, color: 'text-green-600' },
                { label: 'Yıllık Gider', value: finYearly.totalExpense, color: 'text-red-500' },
                { label: 'Yıllık Net Kar', value: finYearly.totalProfit, color: finYearly.totalProfit >= 0 ? 'text-blue-600' : 'text-red-500' },
              ].map(k => (
                <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                  <div className={cn('text-xl font-bold', k.color)}>{k.value.toLocaleString('tr-TR')} ₺</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
                </div>
              ))}
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">{year} Aylık Gelir/Gider</h3>
            <div style={{ height: 250 }}>
              <Bar data={finChart} options={chartOptions} />
            </div>
          </div>

          {/* Aylık tablo */}
          {finYearly && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Ay</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Gelir</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Gider</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Net Kar</th>
                  </tr>
                </thead>
                <tbody>
                  {finYearly.months.map((m: any) => (
                    <tr key={m.month} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2">{MONTHS[m.month - 1]}</td>
                      <td className="px-4 py-2 text-right text-green-600">{m.income > 0 ? m.income.toLocaleString('tr-TR') + ' ₺' : '-'}</td>
                      <td className="px-4 py-2 text-right text-red-500">{m.expense > 0 ? m.expense.toLocaleString('tr-TR') + ' ₺' : '-'}</td>
                      <td className={cn('px-4 py-2 text-right font-medium', m.profit >= 0 ? 'text-blue-600' : 'text-red-500')}>
                        {m.income > 0 || m.expense > 0 ? m.profit.toLocaleString('tr-TR') + ' ₺' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== ÜRETİM ===== */}
      {activeTab === 'uretim' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Ürün', value: cropStats?.total || 0, color: 'text-foreground' },
              { label: 'Büyüyor', value: cropStats?.growing || 0, color: 'text-green-600' },
              { label: 'Hasat Edildi', value: cropStats?.harvested || 0, color: 'text-yellow-600' },
              { label: 'Toplam Hasat', value: `${cropStats?.totalHarvestKg || 0} kg`, color: 'text-blue-600' },
            ].map(k => (
              <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className={cn('text-xl font-bold', k.color)}>{k.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border">
              <h3 className="text-sm font-semibold">Ürün Listesi</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Ürün</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Çeşit</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Bölge</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Durum</th>
                  <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Alan</th>
                </tr>
              </thead>
              <tbody>
                {(crops as any[]).map((crop: any) => (
                  <tr key={crop.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 font-medium">{crop.name}</td>
                    <td className="px-4 py-2 text-muted-foreground">{crop.variety || '-'}</td>
                    <td className="px-4 py-2 text-muted-foreground">{crop.zone?.name || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                        crop.status === 'GROWING' ? 'bg-green-500/15 text-green-600' :
                        crop.status === 'HARVESTED' ? 'bg-yellow-500/15 text-yellow-600' : 'bg-gray-500/15 text-gray-500'
                      )}>
                        {crop.status === 'GROWING' ? 'Büyüyor' : crop.status === 'HARVESTED' ? 'Hasat Edildi' : crop.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-muted-foreground">{crop.area ? `${crop.area} m²` : '-'}</td>
                  </tr>
                ))}
                {(crops as any[]).length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">Ürün bulunamadı</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== HAYVANCILIK ===== */}
      {activeTab === 'hayvan' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Toplam', value: animalStats?.total || 0, color: 'text-foreground' },
              { label: 'Sağlıklı', value: animalStats?.healthy || 0, color: 'text-green-600' },
              { label: 'Gebe', value: animalStats?.pregnant || 0, color: 'text-purple-600' },
              { label: 'Hasta', value: animalStats?.sick || 0, color: 'text-red-500' },
            ].map(k => (
              <div key={k.label} className="bg-card border border-border rounded-xl p-4 text-center">
                <div className={cn('text-2xl font-bold', k.color)}>{k.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Sürü Durum Dağılımı</h3>
              <div style={{ height: 200 }}>
                <Doughnut data={animalChart} options={doughnutOptions} />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Sürü Özeti</h3>
              <div className="space-y-2">
                {[
                  { label: 'Toplam baş sayısı', value: `${animalStats?.total || 0} baş` },
                  { label: 'Sağlıklı oran', value: `%${animalStats?.total ? Math.round((animalStats.healthy / animalStats.total) * 100) : 0}` },
                  { label: 'Gebe dişi', value: `${animalStats?.pregnant || 0} baş` },
                  { label: 'Tedavi altında', value: `${animalStats?.sick || 0} baş` },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm text-muted-foreground">{item.label}</span>
                    <span className="text-sm font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-semibold">Hayvan Listesi</h3>
              <span className="text-xs text-muted-foreground">{(animals as any[]).length} kayıt</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Küpe No</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">İsim</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Irk</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Cinsiyet</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Durum</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-muted-foreground">Ağırlık</th>
                  </tr>
                </thead>
                <tbody>
                  {(animals as any[]).map((a: any) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-2 font-mono text-xs">{a.earTag}</td>
                      <td className="px-4 py-2">{a.name || '-'}</td>
                      <td className="px-4 py-2 text-muted-foreground">{a.breed}</td>
                      <td className="px-4 py-2 text-muted-foreground">{a.gender === 'FEMALE' ? '♀ Dişi' : '♂ Erkek'}</td>
                      <td className="px-4 py-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium',
                          a.status === 'HEALTHY' ? 'bg-green-500/15 text-green-600' :
                          a.status === 'PREGNANT' ? 'bg-purple-500/15 text-purple-600' :
                          a.status === 'SICK' ? 'bg-red-500/15 text-red-500' : 'bg-gray-500/15 text-gray-500'
                        )}>
                          {a.status === 'HEALTHY' ? 'Sağlıklı' : a.status === 'PREGNANT' ? 'Gebe' : a.status === 'SICK' ? 'Hasta' : a.status}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right">{a.weight ? `${a.weight} kg` : '-'}</td>
                    </tr>
                  ))}
                  {(animals as any[]).length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-xs">Hayvan bulunamadı</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
