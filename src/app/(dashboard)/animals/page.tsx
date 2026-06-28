'use client'

import * as XLSX from 'xlsx'
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { Plus, Weight, Syringe, Heart, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

const STATUS_COLOR: Record<string, string> = {
  HEALTHY:    'bg-green-500/15 text-green-600',
  PREGNANT:   'bg-purple-500/15 text-purple-600',
  SICK:       'bg-red-500/15 text-red-600',
  QUARANTINE: 'bg-orange-500/15 text-orange-600',
  SOLD:       'bg-gray-500/15 text-gray-500',
  DEAD:       'bg-gray-500/15 text-gray-400',
}

const STATUS_TR: Record<string, string> = {
  HEALTHY: 'Sağlıklı', PREGNANT: 'Gebe', SICK: 'Hasta',
  QUARANTINE: 'Karantina', SOLD: 'Satıldı', DEAD: 'Öldü',
}

const GENDER_TR: Record<string, string> = { MALE: '♂ Erkek', FEMALE: '♀ Dişi' }

const emptyAnimal = {
  earTag: '', name: '', species: 'Koyun', breed: 'Ile de France',
  gender: 'FEMALE', birthDate: '', weight: '', status: 'HEALTHY', notes: ''
}

type Period = 'daily' | 'weekly' | 'monthly'

function filterByPeriod(logs: any[], period: Period) {
  const sorted = [...logs].sort((a, b) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())
  const now = new Date()

  if (period === 'daily') {
    const limit = new Date(now); limit.setDate(limit.getDate() - 30)
    return sorted.filter(l => new Date(l.measuredAt) >= limit).map(l => ({
      label: new Date(l.measuredAt).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' }),
      weight: l.weight,
    }))
  }

  if (period === 'weekly') {
    const weeks: Record<string, number[]> = {}
    sorted.forEach(l => {
      const d = new Date(l.measuredAt)
      const ws = new Date(d); ws.setDate(d.getDate() - d.getDay())
      const key = ws.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' })
      if (!weeks[key]) weeks[key] = []
      weeks[key].push(l.weight)
    })
    return Object.entries(weeks).slice(-12).map(([label, ws]) => ({
      label, weight: Math.round((ws.reduce((a, b) => a + b, 0) / ws.length) * 10) / 10
    }))
  }

  // monthly
  const months: Record<string, number[]> = {}
  sorted.forEach(l => {
    const key = new Date(l.measuredAt).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' })
    if (!months[key]) months[key] = []
    months[key].push(l.weight)
  })
  return Object.entries(months).slice(-12).map(([label, ws]) => ({
    label, weight: Math.round((ws.reduce((a, b) => a + b, 0) / ws.length) * 10) / 10
  }))
}

function WeightTab({ animal, onAdd, isPending }: { animal: any; onAdd: (data: any) => void; isPending: boolean }) {
  const [period, setPeriod] = useState<Period>('daily')
  const [form, setForm] = useState({ weight: '', notes: '' })
  const logs = animal.weightLogs || []
  const filtered = filterByPeriod(logs, period)

  const weights = logs.map((l: any) => l.weight)
  const sorted = [...logs].sort((a: any, b: any) => new Date(b.measuredAt).getTime() - new Date(a.measuredAt).getTime())
  const lastW = sorted[0]?.weight || 0
  const firstW = [...logs].sort((a: any, b: any) => new Date(a.measuredAt).getTime() - new Date(b.measuredAt).getTime())[0]?.weight || 0
  const gain = logs.length >= 2 ? Math.round((lastW - firstW) * 10) / 10 : 0

  const chartData = {
    labels: filtered.map(f => f.label),
    datasets: [{
      label: 'kg', data: filtered.map(f => f.weight),
      borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.1)',
      borderWidth: 2, pointRadius: 3, tension: 0.4, fill: true,
    }],
  }

  const chartOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 9 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 9 }, callback: (v: any) => `${v}kg` }, beginAtZero: false },
    },
  }

  return (
    <div className="space-y-3">
      {/* İstatistikler */}
      {logs.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Son', value: `${lastW} kg`, color: 'text-green-600' },
            { label: 'Min', value: `${Math.min(...weights)} kg`, color: 'text-blue-500' },
            { label: 'Max', value: `${Math.max(...weights)} kg`, color: 'text-orange-500' },
            { label: 'Artış', value: `${gain >= 0 ? '+' : ''}${gain} kg`, color: gain >= 0 ? 'text-green-600' : 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-muted rounded-lg p-2 text-center">
              <div className={cn('text-sm font-bold', s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Grafik */}
      {logs.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Kilo Grafiği</span>
            <div className="flex gap-0.5 bg-muted p-0.5 rounded-md">
              {(['daily', 'weekly', 'monthly'] as const).map((p, i) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={cn('px-2 py-0.5 text-xs rounded transition-colors',
                    period === p ? 'bg-background shadow-sm' : 'text-muted-foreground'
                  )}>{['Günlük', 'Haftalık', 'Aylık'][i]}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 160 }}>
            <Line data={chartData} options={chartOptions as any} />
          </div>
        </div>
      )}

      {/* Geçmiş */}
      {logs.length > 0 && (
        <div className="space-y-1 max-h-28 overflow-y-auto">
          {sorted.map((w: any) => (
            <div key={w.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded-lg">
              <span className="font-semibold text-green-600">{w.weight} kg</span>
              <span className="text-muted-foreground">{new Date(w.measuredAt).toLocaleDateString('tr-TR')}</span>
              {w.notes && <span className="text-muted-foreground truncate max-w-24">{w.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Ekle */}
      <div className="space-y-2 pt-2 border-t border-border">
        <div className="text-xs font-medium text-muted-foreground">Yeni Kilo Ölçümü</div>
        <div className="flex gap-2">
          <input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })}
            placeholder="kg *" step="0.1" className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background" />
          <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Not" className="flex-1 px-3 py-2 text-xs rounded-lg border border-border bg-background" />
        </div>
        <button onClick={() => { onAdd(form); setForm({ weight: '', notes: '' }) }}
          disabled={!form.weight || isPending}
          className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg disabled:opacity-50 flex items-center gap-1">
          <Weight className="w-3 h-3" /> Kilo Ekle
        </button>
      </div>
    </div>
  )
}

export default function AnimalsPage() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Record<string, string>>({})
  const [form, setForm] = useState(emptyAnimal)
  const [vacForm, setVacForm] = useState({ vaccineName: '', dose: '', unit: 'ml', nextDue: '', veterinary: '', notes: '' })
  const [pregForm, setPregForm] = useState({ matingDate: '', expectedBirth: '', notes: '' })
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals', statusFilter],
    queryFn: () => api.get(`/animals${statusFilter ? `?status=${statusFilter}` : ''}`).then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: stats } = useQuery({
    queryKey: ['animals-stats'],
    queryFn: () => api.get('/animals/stats').then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/animals', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] })
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] })
      setShowForm(false); setForm(emptyAnimal)
      toast.success('Hayvan eklendi')
    },
    onError: () => toast.error('Hata oluştu'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/animals/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] })
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] })
      toast.success('Hayvan silindi')
    },
  })

  const vacMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.post(`/animals/${id}/vaccinations`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] })
      setVacForm({ vaccineName: '', dose: '', unit: 'ml', nextDue: '', veterinary: '', notes: '' })
      toast.success('Aşı kaydedildi')
    },
  })

  const weightMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.post(`/animals/${id}/weights`, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['animals'] }),
  })

  const pregMutation = useMutation({
    mutationFn: ({ id, data }: any) => api.post(`/animals/${id}/pregnancies`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals'] })
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] })
      setPregForm({ matingDate: '', expectedBirth: '', notes: '' })
      toast.success('Gebelik kaydedildi')
    },
  })

  const importMutation = useMutation({
    mutationFn: async (rows: any[]) => {
      const results = []
      for (const row of rows) {
        try { results.push(await api.post('/animals', row)) } catch {}
      }
      return results
    },
    onSuccess: (r) => {
      queryClient.invalidateQueries({ queryKey: ['animals'] })
      queryClient.invalidateQueries({ queryKey: ['animals-stats'] })
      toast.success(`${r.length} hayvan içe aktarıldı`)
    },
  })

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' })
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[]
      const animals = rows.filter(r => r['Küpe No'] || r['earTag']).map(r => ({
        earTag:    String(r['Küpe No'] || r['earTag'] || '').trim(),
        name:      String(r['İsim'] || r['name'] || '').trim() || undefined,
        species:   String(r['Tür'] || r['species'] || 'Koyun').trim(),
        breed:     String(r['Irk'] || r['breed'] || 'Ile de France').trim(),
        gender:    (r['Cinsiyet'] || r['gender'] || 'Dişi') === 'Erkek' ? 'MALE' : 'FEMALE',
        birthDate: r['Doğum Tarihi'] || r['birthDate'] || undefined,
        weight:    r['Ağırlık'] || r['weight'] || undefined,
        status:    'HEALTHY',
        notes:     String(r['Notlar'] || r['notes'] || '').trim() || undefined,
      }))
      if (!animals.length) { toast.error('Hayvan bulunamadı'); return }
      toast.info(`${animals.length} hayvan aktarılıyor...`)
      importMutation.mutate(animals)
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Küpe No', 'İsim', 'Tür', 'Irk', 'Cinsiyet', 'Doğum Tarihi', 'Ağırlık', 'Notlar'],
      ['TR-001', 'Kara', 'Koyun', 'Ile de France', 'Dişi', '2024-01-15', '65', ''],
      ['TR-002', '', 'Koyun', 'Ile de France', 'Erkek', '2023-06-20', '80', 'Damızlık'],
      ['TR-003', 'Boncuk', 'Koyun', 'Ile de France', 'Dişi', '2024-03-10', '58', ''],
    ])
    ws['!cols'] = [12, 10, 10, 16, 10, 14, 10, 20].map(w => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Hayvanlar')
    XLSX.writeFile(wb, 'smartfarm_hayvan_sablonu.xlsx')
  }

  const getTab = (id: string) => activeTab[id] || 'info'
  const setTab = (id: string, tab: string) => setActiveTab(prev => ({ ...prev, [id]: tab }))

  return (
    <div className="space-y-4">
      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Toplam', value: stats.total, color: 'text-foreground' },
            { label: 'Sağlıklı', value: stats.healthy, color: 'text-green-600' },
            { label: 'Gebe', value: stats.pregnant, color: 'text-purple-600' },
            { label: 'Hasta', value: stats.sick, color: 'text-red-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <div className={cn('text-2xl font-bold', s.color)}>{s.value}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-muted p-1 rounded-lg flex-wrap">
          {[['', 'Tümü'], ['HEALTHY', 'Sağlıklı'], ['PREGNANT', 'Gebe'], ['SICK', 'Hasta']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                statusFilter === val ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}>{label}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={downloadTemplate}
            className="px-3 py-2 border border-border text-sm rounded-lg hover:bg-accent text-muted-foreground">
            📥 Şablon
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={importMutation.isPending}
            className="px-3 py-2 border border-green-600 text-green-600 text-sm rounded-lg hover:bg-green-50 dark:hover:bg-green-950 disabled:opacity-50">
            📊 {importMutation.isPending ? 'Aktarılıyor...' : 'Excel İçe Aktar'}
          </button>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelImport} className="hidden" />
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
            <Plus className="w-4 h-4" /> Hayvan Ekle
          </button>
        </div>
      </div>

      {/* Yeni Hayvan Formu */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-semibold">Yeni Hayvan Ekle</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {[
              { label: 'Küpe No *', key: 'earTag', placeholder: 'TR-001' },
              { label: 'İsim', key: 'name', placeholder: 'Opsiyonel' },
              { label: 'Tür', key: 'species', placeholder: 'Koyun' },
              { label: 'Irk', key: 'breed', placeholder: 'Ile de France' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder} className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Cinsiyet</label>
              <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                <option value="FEMALE">♀ Dişi</option>
                <option value="MALE">♂ Erkek</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Doğum Tarihi</label>
              <input type="date" value={form.birthDate} onChange={e => setForm({ ...form, birthDate: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Ağırlık (kg)</label>
              <input type="number" value={form.weight} onChange={e => setForm({ ...form, weight: e.target.value })}
                placeholder="kg" className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Durum</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
                {Object.entries(STATUS_TR).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Notlar" rows={2}
            className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background resize-none" />
          <div className="flex gap-2">
            <button onClick={() => createMutation.mutate(form)} disabled={!form.earTag || createMutation.isPending}
              className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
              {createMutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyAnimal) }}
              className="px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">İptal</button>
          </div>
        </div>
      )}

      {/* Hayvan Listesi */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-8">Yükleniyor...</div>
      ) : (animals as any[]).length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <div className="text-4xl mb-2">🐑</div>
          <p className="text-sm">Henüz hayvan eklenmemiş</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(animals as any[]).map((animal: any) => (
            <div key={animal.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpanded(expanded === animal.id ? null : animal.id)}>
                <div className="w-9 h-9 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-lg shrink-0">🐑</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{animal.earTag}</span>
                    {animal.name && <span className="text-sm text-muted-foreground">({animal.name})</span>}
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[animal.status])}>
                      {STATUS_TR[animal.status]}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                    <span>{animal.breed}</span>
                    <span>{GENDER_TR[animal.gender]}</span>
                    {animal.weight && <span>⚖️ {animal.weight} kg</span>}
                    {animal.weightLogs?.[0] && (
                      <span>Son ölçüm: {new Date(animal.weightLogs[0].measuredAt).toLocaleDateString('tr-TR')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); deleteMutation.mutate(animal.id) }}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  {expanded === animal.id
                    ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {expanded === animal.id && (
                <div className="border-t border-border">
                  <div className="flex border-b border-border">
                    {[['info', 'Bilgi'], ['vaccine', 'Aşı'], ['weight', 'Kilo'], ['pregnancy', 'Gebelik']].map(([tab, label]) => (
                      <button key={tab} onClick={() => setTab(animal.id, tab)}
                        className={cn('px-4 py-2.5 text-xs font-medium border-b-2 transition-colors',
                          getTab(animal.id) === tab
                            ? 'border-green-600 text-green-600'
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}>{label}</button>
                    ))}
                  </div>

                  <div className="p-4">
                    {/* Bilgi */}
                    {getTab(animal.id) === 'info' && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><span className="text-muted-foreground">Tür:</span> {animal.species}</div>
                        <div><span className="text-muted-foreground">Irk:</span> {animal.breed}</div>
                        <div><span className="text-muted-foreground">Cinsiyet:</span> {GENDER_TR[animal.gender]}</div>
                        <div><span className="text-muted-foreground">Ağırlık:</span> {animal.weight ? `${animal.weight} kg` : '-'}</div>
                        {animal.birthDate && <div><span className="text-muted-foreground">Doğum:</span> {new Date(animal.birthDate).toLocaleDateString('tr-TR')}</div>}
                        {animal.notes && <div className="col-span-2"><span className="text-muted-foreground">Not:</span> {animal.notes}</div>}
                      </div>
                    )}

                    {/* Aşı */}
                    {getTab(animal.id) === 'vaccine' && (
                      <div className="space-y-3">
                        {animal.vaccinations?.length > 0 && (
                          <div className="space-y-1 max-h-32 overflow-y-auto">
                            {animal.vaccinations.map((v: any) => (
                              <div key={v.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded-lg flex-wrap gap-1">
                                <span className="font-medium">{v.vaccineName}</span>
                                <span className="text-muted-foreground">{new Date(v.vaccinatedAt).toLocaleDateString('tr-TR')}</span>
                                {v.nextDue && <span className="text-orange-500">Tekrar: {new Date(v.nextDue).toLocaleDateString('tr-TR')}</span>}
                                {v.veterinary && <span className="text-muted-foreground">{v.veterinary}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="text-xs font-medium text-muted-foreground">Yeni Aşı Ekle</div>
                          <div className="grid grid-cols-2 gap-2">
                            <input value={vacForm.vaccineName} onChange={e => setVacForm({ ...vacForm, vaccineName: e.target.value })}
                              placeholder="Aşı adı *" className="px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            <input value={vacForm.veterinary} onChange={e => setVacForm({ ...vacForm, veterinary: e.target.value })}
                              placeholder="Veteriner" className="px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            <input type="date" value={vacForm.nextDue} onChange={e => setVacForm({ ...vacForm, nextDue: e.target.value })}
                              className="px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                            <input value={vacForm.notes} onChange={e => setVacForm({ ...vacForm, notes: e.target.value })}
                              placeholder="Not" className="px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                          </div>
                          <button onClick={() => vacMutation.mutate({ id: animal.id, data: vacForm })}
                            disabled={!vacForm.vaccineName || vacMutation.isPending}
                            className="px-3 py-1.5 bg-green-700 text-white text-xs rounded-lg disabled:opacity-50 flex items-center gap-1">
                            <Syringe className="w-3 h-3" /> Aşı Ekle
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Kilo — grafik dahil */}
                    {getTab(animal.id) === 'weight' && (
                      <WeightTab
                        animal={animal}
                        onAdd={(data) => weightMutation.mutate({ id: animal.id, data })}
                        isPending={weightMutation.isPending}
                      />
                    )}

                    {/* Gebelik */}
                    {getTab(animal.id) === 'pregnancy' && (
                      <div className="space-y-3">
                        {animal.pregnancies?.length > 0 && (
                          <div className="space-y-1">
                            {animal.pregnancies.map((p: any) => (
                              <div key={p.id} className="text-xs p-2 bg-muted rounded-lg space-y-0.5">
                                {p.matingDate && <div>Çiftleşme: {new Date(p.matingDate).toLocaleDateString('tr-TR')}</div>}
                                {p.expectedBirth && <div className="text-purple-600 font-medium">Tahmini doğum: {new Date(p.expectedBirth).toLocaleDateString('tr-TR')}</div>}
                                {p.actualBirth && <div className="text-green-600">Gerçek doğum: {new Date(p.actualBirth).toLocaleDateString('tr-TR')}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {animal.gender === 'FEMALE' && (
                          <div className="space-y-2 pt-2 border-t border-border">
                            <div className="text-xs font-medium text-muted-foreground">Gebelik Kaydı Ekle</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Çiftleşme Tarihi</label>
                                <input type="date" value={pregForm.matingDate} onChange={e => setPregForm({ ...pregForm, matingDate: e.target.value })}
                                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                              </div>
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Tahmini Doğum</label>
                                <input type="date" value={pregForm.expectedBirth} onChange={e => setPregForm({ ...pregForm, expectedBirth: e.target.value })}
                                  className="w-full px-3 py-2 text-xs rounded-lg border border-border bg-background" />
                              </div>
                            </div>
                            <button onClick={() => pregMutation.mutate({ id: animal.id, data: pregForm })}
                              disabled={pregMutation.isPending}
                              className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg disabled:opacity-50 flex items-center gap-1">
                              <Heart className="w-3 h-3" /> Gebelik Ekle
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
