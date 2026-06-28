// ============================================================
// SmartFarm ERP — Login Sayfası
// Email + Password + 2FA destekli
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'
import { toast } from 'sonner'
import { Eye, EyeOff, Sprout, Loader2, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

// ============================================================
// SCHEMA
// ============================================================

const loginSchema = z.object({
  email: z.string().email('Geçerli email giriniz'),
  password: z.string().min(1, 'Şifre zorunludur'),
  twoFACode: z.string().optional(),
})

type LoginForm = z.infer<typeof loginSchema>

// ============================================================
// LOGIN PAGE
// ============================================================

export default function LoginPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [requires2FA, setRequires2FA] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const loginMutation = useMutation({
    mutationFn: (data: LoginForm) => api.post('/auth/login', data),
    onSuccess: ({ data }) => {
      setAuth(data.user, data.accessToken, data.refreshToken)
      toast.success(`Hoş geldiniz, ${data.user.name}!`)
      router.push('/dashboard')
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message
      if (error.response?.data?.requiresTwoFA) {
        setRequires2FA(true)
        toast.info('2FA kodunuzu girin')
        return
      }
      toast.error(msg || 'Giriş başarısız')
    },
  })

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Sol panel - Branding */}
      <div className="hidden md:flex md:w-1/2 lg:w-2/5 bg-gradient-to-br from-brand-800 to-brand-900 flex-col justify-between p-10 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-bold">SmartFarm ERP</div>
            <div className="text-xs text-white/70">v1.0</div>
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-bold mb-4">
            Akıllı Tarım ve<br />Hayvancılık Platformu
          </h1>
          <p className="text-white/70 text-sm leading-relaxed">
            Seranızı, ahırınızı ve tarlanızı tek platformdan yönetin.
            IoT sensörler, SCADA sistemi ve Telegram entegrasyonu ile
            çiftliğinizi her yerden kontrol edin.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[
            { icon: '🌿', label: 'Sera Yönetimi' },
            { icon: '🐑', label: 'Hayvancılık' },
            { icon: '📡', label: 'IoT & SCADA' },
            { icon: '📱', label: 'Telegram Bot' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2 bg-white/10 rounded-lg px-3 py-2">
              <span>{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sağ panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 md:hidden">
            <div className="w-8 h-8 rounded-lg bg-brand-700 flex items-center justify-center">
              <Sprout className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold">SmartFarm ERP</span>
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-bold">Giriş Yap</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Hesabınıza giriş yapın
            </p>
          </div>

          <form onSubmit={handleSubmit(d => loginMutation.mutate(d))} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Email</label>
              <input
                {...register('email')}
                type="email"
                placeholder="ornek@smartfarm.com"
                autoComplete="email"
                className={cn(
                  'w-full px-3 py-2.5 rounded-lg border bg-background text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600',
                  'transition-colors placeholder:text-muted-foreground',
                  errors.email ? 'border-danger' : 'border-input'
                )}
              />
              {errors.email && <p className="text-xs text-danger mt-1">{errors.email.message}</p>}
            </div>

            {/* Şifre */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium">Şifre</label>
                <a href="/forgot-password" className="text-xs text-brand-600 hover:underline">
                  Şifremi unuttum
                </a>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={cn(
                    'w-full px-3 py-2.5 pr-10 rounded-lg border bg-background text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600',
                    'transition-colors placeholder:text-muted-foreground',
                    errors.password ? 'border-danger' : 'border-input'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger mt-1">{errors.password.message}</p>}
            </div>

            {/* 2FA kodu */}
            {requires2FA && (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-brand-600" />
                  <span>Doğrulayıcı uygulamanızdaki 6 haneli kodu girin</span>
                </div>
                <input
                  {...register('twoFACode')}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  className={cn(
                    'w-full px-3 py-2.5 rounded-lg border bg-background text-sm text-center tracking-widest font-mono',
                    'focus:outline-none focus:ring-2 focus:ring-brand-600/30 focus:border-brand-600',
                    'border-input'
                  )}
                />
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className={cn(
                'w-full py-2.5 rounded-lg bg-brand-700 text-white font-medium text-sm',
                'hover:bg-brand-800 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center justify-center gap-2'
              )}
            >
              {loginMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Giriş yapılıyor...</>
              ) : 'Giriş Yap'}
            </button>
          </form>

          {/* Demo credentials */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <div className="font-medium mb-1">Demo hesaplar:</div>
              <div>admin@smartfarm.com / Admin123!</div>
              <div>samet@cayirkoy.com / Owner123!</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
