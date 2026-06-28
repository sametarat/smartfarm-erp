'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Plus, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

const MONTHS = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']

export default function FinancePage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'new'>('dashboard')
  const [typeFilter, setTypeFilter] = useState('')
  const [form, setForm] = useState({
    type: 'INCOME', category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], invoiceNo: ''
  })
  const queryClient = useQueryClient()
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedYear] = useState(now.getFullYear())

  const { data: kpi } = useQuery({
    queryKey: ['finance-kpi'],
    queryFn: () => api.get('/finance/kpi').then(r => r.data),
    refetchInterval: 60000,
  })

  const { data: summary } = useQuery({
    queryKey: ['finance-summary', selectedYear, selectedMonth],
    queryFn: () => api.get('/finance/summary', { params: { year: selectedYear, month: selectedMonth } }).then(r => r.data),
  })

  const { data: yearly } = useQuery({
    queryKey: ['finance-yearly', selectedYear],
    queryFn: () => api.get('/finance/yearly', { params: { year: selectedYear } }).then(r => r.data),
  })

  const { data: categories } = useQuery({
    queryKey: ['finance-categories'],
    queryFn: () => api.get('/finance/categories').then(r => r.data),
  })

  const { data: txData } = useQuery({
    queryKey: ['transactions', typeFilter],
    queryFn: () => api.get('/finance/transactions', { params: { type: typeFilter || undefined } }).then(r => r.data),
    enabled: activeTab === 'transactions',
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/finance/transactions', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-kpi'] })
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] })
      queryClient.invalidateQueries({ queryKey: ['finance-yearly'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      setForm({ type: 'INCOME', category: '', amount: '', description: '', date: new Date().toISOString().split('T')[0], invoiceNo: '' })
      setActiveTab('transactions')
      toast.success('İşlem kaydedildi')
    },
    onError: () => toast.error('Hata oluştu'),
  })

  const chartData = {
    labels: MONTHS,
    datasets: [
      {
        label: 'Gelir',
        data: yearly?.months?.map((m: any) => m.income) || [],
        backgroundColor: 'rgba(34,197,94,0.7)',
        borderRadius: 4,
      },
      {
        label: 'Gider',
        data: yearly?.months?.map((m: any) => m.expense) || [],
        backgroundColor: 'rgba(239,68,68,0.7)',
        borderRadius: 4,
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' as const } },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: (v: any) => `${(v/1000).toFixed(0)}K ₺` } },
    },
  }

  const currentCats = form.type === 'INCOME'
    ? (categories?.income || [])
    : (categories?.expense || [])

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {([['dashboard','📊 Özet'],['transactions','📋 İşlemler'],['new','➕ Yeni İşlem']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              activeTab === tab ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
            )}>{label}</button>
        ))}
      </div>

      {/* ===== DASHBOARD ===== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-4">
          {/* KPI kartları */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Aylık Gelir', value: kpi?.monthlyRevenue || 0, color: 'text-green-600', icon: <TrendingUp className="w-4 h-4" /> },
              { label: 'Aylık Gider', value: kpi?.monthlyExpense || 0, color: 'text-red-500', icon: <TrendingDown className="w-4 h-4" /> },
              { label: 'Net Kar', value: kpi?.monthlyProfit || 0, color: (kpi?.monthlyProfit || 0) >= 0 ? 'text-green-600' : 'text-red-500', icon: <DollarSign className="w-4 h-4" /> },
              { label: 'Büyüme', value: `${kpi?.revenueGrowth || 0}%`, color: (kpi?.revenueGrowth || 0) >= 0 ? 'text-green-600' : 'text-red-500', icon: <TrendingUp className="w-4 h-4" /> },
            ].map(k => (
              <div key={k.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">{k.label}</span>
                  <span className={k.color}>{k.icon}</span>
                </div>
                <div className={cn('text-xl font-bold', k.color)}>
                  {typeof k.value === 'number' ? k.value.toLocaleString('tr-TR') + ' ₺' : k.value}
                </div>
              </div>
            ))}
          </div>

          {/* Aylık seçim + özet */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="text-sm font-semibold">Aylık Özet</h3>
              <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background">
                {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m} {selectedYear}</option>)}
              </select>
            </div>
            {summary && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{summary.income.toLocaleString('tr-TR')} ₺</div>
                  <div className="text-xs text-muted-foreground">Gelir</div>
                </div>
                <div className="text-center p-3 bg-red-500/10 rounded-lg">
                  <div className="text-lg font-bold text-red-500">{summary.expense.toLocaleString('tr-TR')} ₺</div>
                  <div className="text-xs text-muted-foreground">Gider</div>
                </div>
                <div className={cn('text-center p-3 rounded-lg', summary.profit >= 0 ? 'bg-blue-500/10' : 'bg-red-500/10')}>
                  <div className={cn('text-lg font-bold', summary.profit >= 0 ? 'text-blue-600' : 'text-red-500')}>
                    {summary.profit.toLocaleString('tr-TR')} ₺
                  </div>
                  <div className="text-xs text-muted-foreground">Net Kar</div>
                </div>
              </div>
            )}

            {/* Kategori dağılımı */}
            {summary?.byCategory && Object.keys(summary.byCategory).length > 0 && (
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground mb-2">Kategori Dağılımı</div>
                {Object.entries(summary.byCategory)
                  .sort(([, a]: any, [, b]: any) => b - a)
                  .slice(0, 8)
                  .map(([cat, amount]: any) => (
                    <div key={cat} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between text-xs mb-0.5">
                          <span className="truncate">{cat}</span>
                          <span className="font-medium ml-2">{Number(amount).toLocaleString('tr-TR')} ₺</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5">
                          <div className="h-1.5 rounded-full bg-green-500"
                            style={{ width: `${Math.min(100, (amount / (summary.income + summary.expense)) * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Yıllık grafik */}
          {yearly && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">{selectedYear} Yıllık Gelir/Gider</h3>
                <div className="text-xs text-muted-foreground">
                  Net: <span className={cn('font-semibold', (yearly.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-500')}>
                    {(yearly.totalProfit || 0).toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              </div>
              <div style={{ height: 200 }}>
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== İŞLEMLER ===== */}
      {activeTab === 'transactions' && (
        <div className="space-y-3">
          <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
            {[['', 'Tümü'], ['INCOME', '📈 Gelir'], ['EXPENSE', '📉 Gider']].map(([val, label]) => (
              <button key={val} onClick={() => setTypeFilter(val)}
                className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                  typeFilter === val ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
                )}>{label}</button>
            ))}
          </div>

          {txData?.data?.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Henüz işlem yok</p>
            </div>
          ) : (
            <div className="space-y-2">
              {txData?.data?.map((tx: any) => (
                <div key={tx.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                    tx.type === 'INCOME' ? 'bg-green-500/15' : 'bg-red-500/15'
                  )}>
                    {tx.type === 'INCOME'
                      ? <TrendingUp className="w-4 h-4 text-green-600" />
                      : <TrendingDown className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{tx.category}</div>
                    {tx.description && <div className="text-xs text-muted-foreground">{tx.description}</div>}
                  </div>
                  <div className="text-right shrink-0">
                    <div className={cn('text-sm font-bold', tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500')}>
                      {tx.type === 'INCOME' ? '+' : '-'}{Number(tx.amount).toLocaleString('tr-TR')} ₺
                    </div>
                    <div className="text-xs text-muted-foreground">{new Date(tx.date).toLocaleDateString('tr-TR')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== YENİ İŞLEM ===== */}
      {activeTab === 'new' && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-semibold">Yeni Finansal İşlem</h3>

          {/* Gelir / Gider seçimi */}
          <div className="flex gap-2">
            <button onClick={() => setForm({...form, type: 'INCOME', category: ''})}
              className={cn('flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2',
                form.type === 'INCOME'
                  ? 'border-green-500 bg-green-500/10 text-green-600'
                  : 'border-border text-muted-foreground hover:border-green-500/50'
              )}>
              <TrendingUp className="w-4 h-4" /> Gelir
            </button>
            <button onClick={() => setForm({...form, type: 'EXPENSE', category: ''})}
              className={cn('flex-1 py-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center justify-center gap-2',
                form.type === 'EXPENSE'
                  ? 'border-red-500 bg-red-500/10 text-red-500'
                  : 'border-border text-muted-foreground hover:border-red-500/50'
              )}>
              <TrendingDown className="w-4 h-4" /> Gider
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Kategori *</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="">Kategori seç</option>
                {currentCats.map((c: string) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tutar (₺) *</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                placeholder="0.00" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Tarih *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-muted-foreground mb-1 block">Açıklama</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Opsiyonel açıklama" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Fatura No</label>
              <input value={form.invoiceNo} onChange={e => setForm({...form, invoiceNo: e.target.value})}
                placeholder="F-2026-001" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          </div>

          <button
            onClick={() => createMutation.mutate(form)}
            disabled={!form.category || !form.amount || createMutation.isPending}
            className={cn('w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50 transition-colors',
              form.type === 'INCOME' ? 'bg-green-700 hover:bg-green-800' : 'bg-red-600 hover:bg-red-700'
            )}>
            {createMutation.isPending ? 'Kaydediliyor...' : `${form.type === 'INCOME' ? 'Gelir' : 'Gider'} Kaydet`}
          </button>
        </div>
      )}
    </div>
  )
}
