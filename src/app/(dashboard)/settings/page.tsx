'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { useMutation } from '@tanstack/react-query'
import {
  Settings, Wifi, Bell, Shield, Database, Cpu, User,
  Eye, EyeOff, Save, RefreshCw, Check, X
} from 'lucide-react'

// ============================================================
// AYARLAR SEKMELERİ
// ============================================================

const TABS = [
  { id: 'profil',    icon: User,     label: 'Profil' },
  { id: 'sistem',    icon: Settings, label: 'Sistem' },
  { id: 'esp32',     icon: Cpu,      label: 'ESP32 / IoT' },
  { id: 'bildirim',  icon: Bell,     label: 'Bildirimler' },
  { id: 'guvenlik',  icon: Shield,   label: 'Güvenlik' },
  { id: 'veritabani',icon: Database, label: 'Veritabanı' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-4">
      <h3 className="text-sm font-semibold border-b border-border pb-2">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={cn('relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer',
        value ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
      )}>
      <span className={cn('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
        value ? 'translate-x-5' : 'translate-x-0.5'
      )} />
    </button>
  )
}

// ============================================================
// PROFIL SEKMESİ
// ============================================================

function ProfilTab() {
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    name: user?.name || '', surname: user?.surname || '',
    email: user?.email || '', phone: '', telegramId: user?.telegramId || '',
  })
  const [saved, setSaved] = useState(false)

  const save = () => {
    setSaved(true)
    toast.success('Profil güncellendi')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Section title="Kişisel Bilgiler">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-full bg-green-700 flex items-center justify-center text-white text-xl font-bold">
            {user?.name?.[0]}{user?.surname?.[0]}
          </div>
          <div>
            <div className="font-semibold">{user?.name} {user?.surname}</div>
            <div className="text-sm text-muted-foreground">{user?.role?.displayName}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Ad', key: 'name' },
            { label: 'Soyad', key: 'surname' },
            { label: 'Email', key: 'email' },
            { label: 'Telefon', key: 'phone', placeholder: '+90...' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm({...form, [f.key]: e.target.value})}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          ))}
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Telegram ID</label>
            <input value={form.telegramId} onChange={e => setForm({...form, telegramId: e.target.value})}
              placeholder="Telegram chat ID"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            <p className="text-xs text-muted-foreground mt-1">
              Bot'a /start yazarak ID'nizi öğrenebilirsiniz: @samet_cilek_bot
            </p>
          </div>
        </div>
        <button onClick={save}
          className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Kaydedildi!' : 'Kaydet'}
        </button>
      </Section>

      <Section title="Rol ve Yetkiler">
        <div className="space-y-2">
          <Field label="Rol" description="Sistem yöneticisi tarafından atanır">
            <span className="text-sm font-medium px-3 py-1 bg-green-500/15 text-green-600 rounded-full">
              {user?.role?.displayName}
            </span>
          </Field>
          <div className="pt-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">Yetkilerim</div>
            <div className="flex flex-wrap gap-1">
              {user?.role?.permissions?.map((p, i) => (
                <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                  {p.module}:{p.action}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Section>
    </div>
  )
}

// ============================================================
// SİSTEM SEKMESİ
// ============================================================

function SistemTab() {
  const [settings, setSettings] = useState({
    farmName: 'Çayırköy Tarım İşletmesi',
    farmLocation: 'Dağköy, İzmit / Kocaeli',
    timezone: 'Europe/Istanbul',
    language: 'tr',
    dateFormat: 'DD.MM.YYYY',
    currency: 'TRY',
    autoRefresh: true,
    refreshInterval: '30',
    darkMode: false,
  })

  const save = () => toast.success('Sistem ayarları kaydedildi')

  return (
    <div className="space-y-4">
      <Section title="İşletme Bilgileri">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">İşletme Adı</label>
            <input value={settings.farmName} onChange={e => setSettings({...settings, farmName: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Konum</label>
            <input value={settings.farmLocation} onChange={e => setSettings({...settings, farmLocation: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Para Birimi</label>
            <select value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
              <option value="TRY">₺ Türk Lirası</option>
              <option value="USD">$ Dolar</option>
              <option value="EUR">€ Euro</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Saat Dilimi</label>
            <select value={settings.timezone} onChange={e => setSettings({...settings, timezone: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background">
              <option value="Europe/Istanbul">Türkiye (UTC+3)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
        </div>
      </Section>

      <Section title="Arayüz Ayarları">
        <Field label="Otomatik Yenileme" description="Dashboard verilerini otomatik güncelle">
          <Toggle value={settings.autoRefresh} onChange={v => setSettings({...settings, autoRefresh: v})} />
        </Field>
        {settings.autoRefresh && (
          <Field label="Yenileme Süresi" description="Saniye cinsinden">
            <select value={settings.refreshInterval} onChange={e => setSettings({...settings, refreshInterval: e.target.value})}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background">
              <option value="10">10 sn</option>
              <option value="30">30 sn</option>
              <option value="60">1 dk</option>
              <option value="300">5 dk</option>
            </select>
          </Field>
        )}
      </Section>

      <button onClick={save}
        className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
        <Save className="w-4 h-4" /> Kaydet
      </button>
    </div>
  )
}

// ============================================================
// ESP32 SEKMESİ
// ============================================================

function Esp32Tab() {
  const [settings, setSettings] = useState({
    esp32Url: process.env.NEXT_PUBLIC_ESP32_URL || 'http://192.168.1.100',
    apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
    wsUrl: process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001',
    mqttUrl: 'mqtt://localhost:1883',
    mqttUser: '',
    mqttPass: '',
    autoMode: false,
    seraMaxTemp: '28',
    seraMinTemp: '15',
    tankKritik: '15',
    tankDusuk: '30',
    amonyakUyari: '25',
  })

  const [testResult, setTestResult] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')

  const testConnection = async () => {
    setTestResult('testing')
    try {
      const res = await fetch(`${settings.esp32Url}/api/data`, { signal: AbortSignal.timeout(5000) })
      if (res.ok) { setTestResult('ok'); toast.success('ESP32 bağlantısı başarılı!') }
      else { setTestResult('fail'); toast.error('ESP32 yanıt vermedi') }
    } catch {
      setTestResult('fail'); toast.error('ESP32\'ye bağlanılamadı')
    }
  }

  const save = () => toast.success('IoT ayarları kaydedildi')

  return (
    <div className="space-y-4">
      <Section title="ESP32 Bağlantısı">
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">ESP32 IP Adresi</label>
            <div className="flex gap-2">
              <input value={settings.esp32Url} onChange={e => setSettings({...settings, esp32Url: e.target.value})}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono" />
              <button onClick={testConnection} disabled={testResult === 'testing'}
                className={cn('px-3 py-2 text-sm rounded-lg flex items-center gap-1.5 border transition-colors',
                  testResult === 'ok' ? 'border-green-500 text-green-600 bg-green-500/10' :
                  testResult === 'fail' ? 'border-red-500 text-red-500 bg-red-500/10' :
                  'border-border hover:bg-accent'
                )}>
                {testResult === 'testing' ? <RefreshCw className="w-4 h-4 animate-spin" /> :
                 testResult === 'ok' ? <Check className="w-4 h-4" /> :
                 testResult === 'fail' ? <X className="w-4 h-4" /> :
                 <Wifi className="w-4 h-4" />}
                Test
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Mevcut: <code className="font-mono">http://192.168.1.100</code>
            </p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API URL</label>
            <input value={settings.apiUrl} onChange={e => setSettings({...settings, apiUrl: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono" />
          </div>
        </div>
      </Section>

      <Section title="Otomasyon Eşikleri">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Sera Maks. Sıcaklık (°C)', key: 'seraMaxTemp' },
            { label: 'Sera Min. Sıcaklık (°C)', key: 'seraMinTemp' },
            { label: 'Tank Kritik Seviye (%)', key: 'tankKritik' },
            { label: 'Tank Düşük Seviye (%)', key: 'tankDusuk' },
            { label: 'Amonyak Uyarı (ppm)', key: 'amonyakUyari' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
              <input type="number" value={(settings as any)[f.key]} onChange={e => setSettings({...settings, [f.key]: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
            </div>
          ))}
        </div>
      </Section>

      <Section title="MQTT Broker">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">MQTT URL</label>
            <input value={settings.mqttUrl} onChange={e => setSettings({...settings, mqttUrl: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Kullanıcı</label>
            <input value={settings.mqttUser} onChange={e => setSettings({...settings, mqttUser: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Şifre</label>
            <input type="password" value={settings.mqttPass} onChange={e => setSettings({...settings, mqttPass: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background" />
          </div>
        </div>
      </Section>

      <button onClick={save}
        className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
        <Save className="w-4 h-4" /> Kaydet
      </button>
    </div>
  )
}

// ============================================================
// BİLDİRİM SEKMESİ
// ============================================================

function BildirimTab() {
  const [settings, setSettings] = useState({
    telegramEnabled: true,
    telegramToken: '8758391202:AAGYmaev9OHcN4vvahtS7OK68CTXU_Yhxtw',
    telegramChatId: '6537189006',
    morningReport: true,
    morningTime: '07:00',
    alarmNotify: true,
    taskReminder: true,
    lowStockAlert: true,
    overdueTask: true,
    deviceOffline: true,
    sensorAlarm: true,
    phAlarm: true,
    amonyakAlarm: true,
    tankAlarm: true,
  })

  const [showToken, setShowToken] = useState(false)
  const save = () => toast.success('Bildirim ayarları kaydedildi')

  return (
    <div className="space-y-4">
      <Section title="Telegram Bot">
        <Field label="Telegram Bildirimleri" description="Görev, alarm ve rapor bildirimleri">
          <Toggle value={settings.telegramEnabled} onChange={v => setSettings({...settings, telegramEnabled: v})} />
        </Field>
        {settings.telegramEnabled && (
          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Bot Token</label>
              <div className="flex gap-2">
                <input type={showToken ? 'text' : 'password'} value={settings.telegramToken}
                  onChange={e => setSettings({...settings, telegramToken: e.target.value})}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono" />
                <button onClick={() => setShowToken(!showToken)} className="px-3 py-2 border border-border rounded-lg hover:bg-accent">
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Chat ID</label>
              <input value={settings.telegramChatId} onChange={e => setSettings({...settings, telegramChatId: e.target.value})}
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background font-mono" />
            </div>
          </div>
        )}
      </Section>

      <Section title="Zamanlı Raporlar">
        <Field label="Sabah Raporu" description="Her sabah sistem özeti">
          <Toggle value={settings.morningReport} onChange={v => setSettings({...settings, morningReport: v})} />
        </Field>
        {settings.morningReport && (
          <Field label="Rapor Saati">
            <input type="time" value={settings.morningTime} onChange={e => setSettings({...settings, morningTime: e.target.value})}
              className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background" />
          </Field>
        )}
      </Section>

      <Section title="Alarm Bildirimleri">
        {[
          { key: 'sensorAlarm', label: 'Sensör Alarmları', desc: 'Sıcaklık, nem, EC anormalliği' },
          { key: 'phAlarm', label: 'pH Alarmı', desc: 'pH hedef aralığı dışına çıkınca' },
          { key: 'amonyakAlarm', label: 'Amonyak Alarmı', desc: '25 ppm üzeri' },
          { key: 'tankAlarm', label: 'Tank Alarmı', desc: 'Su deposu kritik seviye' },
          { key: 'deviceOffline', label: 'Cihaz Bağlantı Kopması', desc: 'ESP32 offline olunca' },
          { key: 'lowStockAlert', label: 'Düşük Stok Uyarısı', desc: 'Minimum stok seviyesi' },
          { key: 'taskReminder', label: 'Görev Hatırlatıcı', desc: 'Bugün biten görevler' },
          { key: 'overdueTask', label: 'Geciken Görev', desc: 'Yüksek öncelikli görevler' },
        ].map(item => (
          <Field key={item.key} label={item.label} description={item.desc}>
            <Toggle value={(settings as any)[item.key]} onChange={v => setSettings({...settings, [item.key]: v})} />
          </Field>
        ))}
      </Section>

      <button onClick={save}
        className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white text-sm rounded-lg hover:bg-green-800">
        <Save className="w-4 h-4" /> Kaydet
      </button>
    </div>
  )
}

// ============================================================
// GÜVENLİK SEKMESİ
// ============================================================

function GuvenlikTab() {
  const [passForm, setPassForm] = useState({ current: '', newPass: '', confirm: '' })
  const [show, setShow] = useState(false)
  const [settings, setSettings] = useState({
    twoFA: false,
    sessionTimeout: '480',
    ipWhitelist: false,
  })

  const changePass = () => {
    if (passForm.newPass !== passForm.confirm) { toast.error('Şifreler eşleşmiyor'); return }
    if (passForm.newPass.length < 8) { toast.error('Şifre en az 8 karakter olmalı'); return }
    toast.success('Şifre değiştirildi')
    setPassForm({ current: '', newPass: '', confirm: '' })
  }

  return (
    <div className="space-y-4">
      <Section title="Şifre Değiştir">
        <div className="space-y-3">
          {[
            { label: 'Mevcut Şifre', key: 'current' },
            { label: 'Yeni Şifre', key: 'newPass' },
            { label: 'Yeni Şifre Tekrar', key: 'confirm' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
              <div className="flex gap-2">
                <input type={show ? 'text' : 'password'} value={(passForm as any)[f.key]}
                  onChange={e => setPassForm({...passForm, [f.key]: e.target.value})}
                  className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background" />
                {f.key === 'current' && (
                  <button onClick={() => setShow(!show)} className="px-3 py-2 border border-border rounded-lg hover:bg-accent">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button onClick={changePass}
            disabled={!passForm.current || !passForm.newPass || !passForm.confirm}
            className="px-4 py-2 bg-green-700 text-white text-sm rounded-lg disabled:opacity-50">
            Şifreyi Değiştir
          </button>
        </div>
      </Section>

      <Section title="Oturum Güvenliği">
        <Field label="İki Faktörlü Doğrulama" description="Google Authenticator ile güvenli giriş">
          <Toggle value={settings.twoFA} onChange={v => setSettings({...settings, twoFA: v})} />
        </Field>
        <Field label="Oturum Zaman Aşımı" description="Hareketsizlik süresi (dakika)">
          <select value={settings.sessionTimeout} onChange={e => setSettings({...settings, sessionTimeout: e.target.value})}
            className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background">
            <option value="60">1 saat</option>
            <option value="240">4 saat</option>
            <option value="480">8 saat</option>
            <option value="1440">24 saat</option>
          </select>
        </Field>
      </Section>
    </div>
  )
}

// ============================================================
// VERİTABANI SEKMESİ
// ============================================================

function VeritabaniTab() {
  const [dbInfo] = useState({
    host: 'localhost',
    port: '5432',
    name: 'smartfarm',
    user: 'smartfarm',
    version: 'PostgreSQL 16',
    size: '24.5 MB',
    tables: 22,
  })

  const backup = () => toast.info('Yedekleme başlatıldı...')

  return (
    <div className="space-y-4">
      <Section title="Veritabanı Bilgileri">
        <div className="space-y-2">
          {[
            { label: 'Sunucu', value: `${dbInfo.host}:${dbInfo.port}` },
            { label: 'Veritabanı', value: dbInfo.name },
            { label: 'Kullanıcı', value: dbInfo.user },
            { label: 'Sürüm', value: dbInfo.version },
            { label: 'Boyut', value: dbInfo.size },
            { label: 'Tablo Sayısı', value: String(dbInfo.tables) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-sm font-mono font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Yedekleme">
        <Field label="Otomatik Yedekleme" description="Her gece saat 02:00'de">
          <Toggle value={true} onChange={() => {}} />
        </Field>
        <div className="pt-2">
          <button onClick={backup}
            className="flex items-center gap-2 px-4 py-2 border border-border text-sm rounded-lg hover:bg-accent">
            <Database className="w-4 h-4" /> Manuel Yedek Al
          </button>
        </div>
      </Section>

      <Section title="Tehlikeli Alan">
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="text-sm font-medium text-red-500 mb-1">⚠️ Dikkat</div>
          <div className="text-xs text-muted-foreground mb-3">Bu işlemler geri alınamaz. Devam etmeden önce yedek aldığınızdan emin olun.</div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 text-xs border border-red-500/50 text-red-500 rounded-lg hover:bg-red-500/10"
              onClick={() => toast.error('Bu işlem devre dışı bırakılmıştır')}>
              Test Verilerini Temizle
            </button>
          </div>
        </div>
      </Section>
    </div>
  )
}

// ============================================================
// ANA SAYFA
// ============================================================

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profil')

  return (
    <div className="flex gap-6">
      {/* Sol menü */}
      <div className="w-48 shrink-0 hidden md:block">
        <nav className="space-y-0.5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors text-left',
                activeTab === tab.id
                  ? 'bg-green-500/10 text-green-600 font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              )}>
              <tab.icon className="w-4 h-4 shrink-0" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Mobil tab bar */}
      <div className="md:hidden w-full">
        <div className="flex gap-1 bg-muted p-1 rounded-lg mb-4 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={cn('px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap',
                activeTab === tab.id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              )}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 min-w-0">
        {activeTab === 'profil'     && <ProfilTab />}
        {activeTab === 'sistem'     && <SistemTab />}
        {activeTab === 'esp32'      && <Esp32Tab />}
        {activeTab === 'bildirim'   && <BildirimTab />}
        {activeTab === 'guvenlik'   && <GuvenlikTab />}
        {activeTab === 'veritabani' && <VeritabaniTab />}
      </div>
    </div>
  )
}
