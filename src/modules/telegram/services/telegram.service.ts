// ============================================================
// SmartFarm ERP — Telegram Service v2
// Görev + ESP32 Kontrol + Sensör Sorgulama + Alarm + Rol Bazlı
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../core/prisma/prisma.service'
import * as TelegramBot from 'node-telegram-bot-api'
import axios from 'axios'

const PRIORITY_EMOJI: Record<string, string> = {
  CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🟢',
}

const TYPE_EMOJI: Record<string, string> = {
  IRRIGATION: '💧', FERTILIZATION: '🧪', HARVESTING: '🌾',
  MAINTENANCE: '🔧', VETERINARY: '💉', FEEDING: '🌿',
  INSPECTION: '🔍', CLEANING: '🧹', GENERAL: '📋',
}

const RELAY_MAP: Record<string, number> = {
  'sera:pompa': 13, 'sera:fan': 15, 'sera:led': 14, 'sera:isit': 27,
  'ahir:fan': 26, 'ahir:scraper': 25, 'ahir:suluk': 23, 'ahir:yem': 4,
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name)
  private bot: TelegramBot
  private readonly botToken: string
  private readonly esp32Url: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '')
    this.esp32Url = this.config.get<string>('ESP32_URL', 'http://192.168.1.100')
  }

  async onModuleInit(): Promise<void> {
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN tanımlı değil — Telegram servisi devre dışı')
      return
    }
    this.bot = new TelegramBot(this.botToken, { polling: true })
    this.setupCommands()
    this.logger.log('Telegram Bot v2 başlatıldı')
  }

  // ============================================================
  // YARDIMCI METODLAR
  // ============================================================

  private async getUser(chatId: string) {
    return this.prisma.user.findFirst({
      where: { telegramId: chatId },
      include: { role: true },
    })
  }

  private async requireUser(chatId: string): Promise<any | null> {
    const user = await this.getUser(chatId)
    if (!user) {
      await this.bot.sendMessage(chatId,
        `❌ Hesabınız bağlı değil\\. Sistem yöneticinize Telegram ID'nizi verin:\n\`${chatId}\``,
        { parse_mode: 'MarkdownV2' })
      return null
    }
    return user
  }

  private isOwner(user: any): boolean {
    return user?.role?.name === 'OWNER' || user?.role?.name === 'SUPER_ADMIN'
  }

  private isTech(user: any): boolean {
    return this.isOwner(user) || user?.role?.name === 'TECHNICIAN'
  }

  private isBarn(user: any): boolean {
    return this.isOwner(user) || user?.role?.name === 'BARN'
  }

  private async esp32Get(path: string) {
    try {
      const r = await axios.get(`${this.esp32Url}${path}`, { timeout: 5000 })
      return r.data
    } catch {
      return null
    }
  }

  private async esp32Post(path: string, params: any) {
    try {
      const url = `${this.esp32Url}${path}?` + new URLSearchParams(params).toString()
      const r = await axios.post(url, {}, { timeout: 5000 })
      return r.data
    } catch {
      return null
    }
  }

  private async sendRelay(chatId: string, zone: string, relay: string, val: number, label: string) {
    const relayId = RELAY_MAP[`${zone}:${relay}`]
    if (!relayId) return
    const result = await this.esp32Post('/api/ctrl', { d: relayId, v: val })
    if (result) {
      await this.bot.sendMessage(chatId, `✅ ${label}\n🕐 ${new Date().toLocaleTimeString('tr-TR')}`)
    } else {
      await this.bot.sendMessage(chatId, '❌ ESP32 bağlantısı yok. Komut gönderilemedi.')
    }
  }

  // ============================================================
  // KOMUTLAR
  // ============================================================

  private setupCommands(): void {

    // /start
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const existing = await this.getUser(chatId)

      if (existing) {
        await this.bot.sendMessage(chatId,
          `🌱 Hoş geldiniz, *${existing.name} ${existing.surname}!*\n\n` +
          `Rol: ${existing.role?.displayName || existing.role?.name}\n` +
          `Komutlar için /yardim`,
          { parse_mode: 'Markdown' })
        return
      }

      await this.bot.sendMessage(chatId,
        `🌱 *SmartFarm ERP'ye Hoş Geldiniz!*\n\n` +
        `Telegram ID'niz:\n\`${chatId}\`\n\n` +
        `Bu ID'yi sistem yöneticinize vererek hesabınıza bağlatın.`,
        { parse_mode: 'Markdown' })
    })

    // /yardim — ROL BAZLI
    this.bot.onText(/\/yardim/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.getUser(chatId)

      let message = `📖 *SmartFarm Bot Komutları*\n\n`

      message += `*📋 Görev Komutları*\n`
      message += `/gorevler — Bugünkü görevlerim\n`
      message += `/tumgorevler — Tüm bekleyen görevler\n`
      message += `/durum — Sistem özeti\n\n`

      if (this.isTech(user)) {
        message += `*🌿 Sera Komutları*\n`
        message += `/sera — Sera durumu \\+ kontrol\n`
        message += `/sera\\_pompa\\_ac \\| /sera\\_pompa\\_kapat\n`
        message += `/sera\\_fan\\_ac \\| /sera\\_fan\\_kapat\n`
        message += `/sera\\_led\\_ac \\| /sera\\_led\\_kapat\n`
        message += `/sera\\_isit\\_ac \\| /sera\\_isit\\_kapat\n\n`
      }

      if (this.isBarn(user)) {
        message += `*🐑 Ahır Komutları*\n`
        message += `/ahir — Ahır durumu \\+ kontrol\n`
        message += `/ahir\\_fan\\_ac \\| /ahir\\_fan\\_kapat\n`
        message += `/ahir\\_scraper\\_ac — Scraper başlat\n`
        message += `/ahir\\_yem\\_ver — Yem ver \\(45sn\\)\n`
        message += `/hayvanlar — Sürü durumu\n\n`
      }

      if (this.isOwner(user)) {
        message += `*📊 Yönetim Komutları*\n`
        message += `/stok — Düşük stok uyarıları\n`
        message += `/finans — Aylık finans özeti\n\n`
      }

      message += `*ℹ️ Diğer*\n`
      message += `/start — Hesap bilgileriniz\n`
      message += `/yardim — Bu menü`

      await this.bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2' })
    })

    // /gorevler
    this.bot.onText(/\/gorevler$/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      const today = new Date(); today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)

      const tasks = await this.prisma.task.findMany({
        where: {
          assigneeId: user.id,
          dueDate: { gte: today, lt: tomorrow },
          status: { in: ['PENDING', 'IN_PROGRESS'] },
          deletedAt: null,
        },
        orderBy: { priority: 'desc' },
      })

      if (tasks.length === 0) {
        await this.bot.sendMessage(chatId, '✅ Bugün için bekleyen göreviniz yok!')
        return
      }

      let message = `📋 *Bugünkü Görevlerim (${tasks.length}):*\n\n`
      for (const task of tasks) {
        const emoji = PRIORITY_EMOJI[task.priority] || '⚪'
        const typeEmoji = TYPE_EMOJI[(task as any).type] || '📋'
        message += `${emoji} ${typeEmoji} *${task.title}*\n`
        if (task.description) message += `   _${task.description.slice(0, 60)}_\n`
        message += `   /tamamla\\_${task.id}\n\n`
      }
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // /tumgorevler
    this.bot.onText(/\/tumgorevler/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      const tasks = await this.prisma.task.findMany({
        where: {
          ...(this.isOwner(user) ? {} : { assigneeId: user.id }),
          status: 'PENDING',
          deletedAt: null,
        },
        orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        take: 10,
        include: { assignee: { select: { name: true, surname: true } } },
      })

      if (tasks.length === 0) {
        await this.bot.sendMessage(chatId, '✅ Bekleyen görev yok!')
        return
      }

      let message = `📋 *${this.isOwner(user) ? 'Tüm' : 'Benim'} Bekleyen Görevler (${tasks.length}):*\n\n`
      for (const task of tasks) {
        const emoji = PRIORITY_EMOJI[task.priority] || '⚪'
        const due = task.dueDate ? new Date(task.dueDate).toLocaleDateString('tr-TR') : '—'
        const who = this.isOwner(user) && (task as any).assignee
          ? ` — ${(task as any).assignee.name}`
          : ''
        message += `${emoji} *${task.title}*${who}  _(${due})_\n`
      }
      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // /durum
    this.bot.onText(/\/durum/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      const [pending, completedToday, animals, stocks] = await Promise.all([
        this.isOwner(user)
          ? this.prisma.task.count({ where: { status: 'PENDING', deletedAt: null } })
          : this.prisma.task.count({ where: { status: 'PENDING', assigneeId: user.id, deletedAt: null } }),
        this.prisma.task.count({
          where: { status: 'COMPLETED', completedAt: { gte: new Date(new Date().setHours(0,0,0,0)) } }
        }),
        this.prisma.animal.count({ where: { deletedAt: null } }),
        this.prisma.stock.findMany({ where: { minQuantity: { not: null } } }),
      ])

      const lowStock = stocks.filter((s: any) => s.minQuantity && s.quantity <= s.minQuantity)
      const esp32Data = await this.esp32Get('/api/data')

      let sensorLine = '📡 ESP32: _Bağlı değil_\n'
      if (esp32Data) {
        const temp = esp32Data?.sera?.temp || '—'
        const ph   = esp32Data?.sera?.ph   || '—'
        const tank = esp32Data?.sera?.tank || '—'
        const amonyak = esp32Data?.ahir?.amonyak || '—'
        const phOk = ph !== '—' && parseFloat(ph) >= 5.8 && parseFloat(ph) <= 6.2
        sensorLine =
          `📡 *ESP32 Bağlı* ✅\n` +
          `🌡️ Sera: ${temp}°C | ${phOk ? '✅' : '⚠️'} pH ${ph} | 🔵 Tank %${tank}\n` +
          `🐑 Ahır NH₃: ${amonyak} ppm\n`
      }

      const message =
        `📊 *SmartFarm Sistem Durumu*\n` +
        `🕐 ${new Date().toLocaleString('tr-TR')}\n\n` +
        `📋 ${this.isOwner(user) ? 'Toplam' : 'Benim'} Bekleyen: *${pending}*\n` +
        `✅ Bugün Tamamlanan: *${completedToday}*\n` +
        `🐑 Toplam Hayvan: *${animals} baş*\n` +
        (this.isOwner(user) ? `📦 Düşük Stok: *${lowStock.length} kalem*\n` : '') +
        `\n${sensorLine}`

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // /sera
    this.bot.onText(/\/sera$/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      if (!this.isTech(user)) {
        await this.bot.sendMessage(chatId, '❌ Bu komut için yetkiniz yok.')
        return
      }

      const data = await this.esp32Get('/api/data')
      if (!data) { await this.bot.sendMessage(chatId, '❌ ESP32 bağlantısı yok.'); return }

      const s = data.sera || {}
      const phOk = s.ph >= 5.8 && s.ph <= 6.2
      const ecOk = s.ec >= 1.0 && s.ec <= 1.4

      const message =
        `🌿 *Sera Durumu*\n\n` +
        `🌡️ Sıcaklık: *${s.temp || '—'}°C*\n` +
        `💧 Nem: *${s.hum || '—'}%*\n` +
        `${phOk ? '✅' : '⚠️'} pH: *${s.ph || '—'}* _(hedef: 5.8\\-6.2)_\n` +
        `${ecOk ? '✅' : '⚠️'} EC: *${s.ec || '—'} mS/cm* _(hedef: 1.0\\-1.4)_\n` +
        `${s.tank > 30 ? '✅' : s.tank > 15 ? '⚠️' : '🚨'} Tank: *%${s.tank || '—'}*\n\n` +
        `💧 Pompa: ${s.pompa ? '🟢 AÇIK' : '🔴 KAPALI'}\n` +
        `💨 Fan: ${s.fan ? '🟢 AÇIK' : '🔴 KAPALI'}\n` +
        `💡 LED: ${s.led ? '🟢 AÇIK' : '🔴 KAPALI'}\n` +
        `🔥 Isıtıcı: ${s.isit ? '🟢 AÇIK' : '🔴 KAPALI'}\n\n` +
        `🕐 ${new Date().toLocaleTimeString('tr-TR')}`

      const keyboard = {
        inline_keyboard: [
          [
            { text: s.pompa ? '💧 Pompa Kapat' : '💧 Pompa Aç', callback_data: `sera:pompa:${s.pompa ? 0 : 1}` },
            { text: s.fan   ? '💨 Fan Kapat'   : '💨 Fan Aç',   callback_data: `sera:fan:${s.fan ? 0 : 1}` },
          ],
          [
            { text: s.led  ? '💡 LED Kapat'       : '💡 LED Aç',       callback_data: `sera:led:${s.led ? 0 : 1}` },
            { text: s.isit ? '🔥 Isıtıcı Kapat'   : '🔥 Isıtıcı Aç',   callback_data: `sera:isit:${s.isit ? 0 : 1}` },
          ],
          [{ text: '🔄 Yenile', callback_data: 'refresh:sera' }],
        ]
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'MarkdownV2', reply_markup: keyboard })
    })

    // /ahir
    this.bot.onText(/\/ahir$/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      if (!this.isBarn(user)) {
        await this.bot.sendMessage(chatId, '❌ Bu komut için yetkiniz yok.')
        return
      }

      const data = await this.esp32Get('/api/data')
      if (!data) { await this.bot.sendMessage(chatId, '❌ ESP32 bağlantısı yok.'); return }

      const a = data.ahir || {}
      const amonyak = parseFloat(a.amonyak || '0')

      const message =
        `🐑 *Ahır Durumu*\n\n` +
        `🌡️ Sıcaklık: *${a.temp || '—'}°C*\n` +
        `💧 Nem: *${a.hum || '—'}%*\n` +
        `${amonyak < 25 ? '✅' : amonyak < 50 ? '⚠️' : '🚨'} Amonyak: *${a.amonyak || '—'} ppm*\n` +
        `🚶 Hareket: ${a.har ? '🚨 VAR' : '✅ Yok'}\n\n` +
        `💨 Fan: ${a.fan ? '🟢 AÇIK' : '🔴 KAPALI'}\n` +
        `🔄 Scraper: ${a.scraper ? '🟢 AÇIK' : '🔴 KAPALI'}\n` +
        `💧 Suluk: ${a.suluk ? '🟢 AÇIK' : '🔴 KAPALI'}\n` +
        `🌾 Yem Motor: ${a.yem ? '🟢 AÇIK' : '🔴 KAPALI'}\n\n` +
        `🕐 ${new Date().toLocaleTimeString('tr-TR')}`

      const keyboard = {
        inline_keyboard: [
          [
            { text: a.fan     ? '💨 Fan Kapat'        : '💨 Fan Aç',        callback_data: `ahir:fan:${a.fan ? 0 : 1}` },
            { text: a.scraper ? '🔄 Scraper Durdur'   : '🔄 Scraper Başlat', callback_data: `ahir:scraper:${a.scraper ? 0 : 1}` },
          ],
          [
            { text: a.suluk ? '💧 Suluğu Kapat' : '💧 Suluğu Aç', callback_data: `ahir:suluk:${a.suluk ? 0 : 1}` },
            { text: '🌾 Yem Ver (45sn)',                            callback_data: 'ahir:yem:1' },
          ],
          [{ text: '🔄 Yenile', callback_data: 'refresh:ahir' }],
        ]
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown', reply_markup: keyboard })
    })

    // /hayvanlar
    this.bot.onText(/\/hayvanlar/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      if (!this.isBarn(user)) {
        await this.bot.sendMessage(chatId, '❌ Bu komut için yetkiniz yok.')
        return
      }

      const [total, healthy, pregnant, sick] = await Promise.all([
        this.prisma.animal.count({ where: { deletedAt: null } }),
        this.prisma.animal.count({ where: { status: 'HEALTHY', deletedAt: null } }),
        this.prisma.animal.count({ where: { status: 'PREGNANT', deletedAt: null } }),
        this.prisma.animal.count({ where: { status: 'SICK', deletedAt: null } }),
      ])

      const sickAnimals = sick > 0 ? await this.prisma.animal.findMany({
        where: { status: 'SICK', deletedAt: null },
        select: { earTag: true, name: true },
      }) : []

      let message =
        `🐑 *Sürü Durumu*\n\n` +
        `📊 Toplam: *${total} baş*\n` +
        `✅ Sağlıklı: ${healthy} baş\n` +
        `🤰 Gebe: ${pregnant} baş\n` +
        `🏥 Hasta: ${sick} baş\n`

      if (sickAnimals.length > 0) {
        message += `\n⚠️ *Hasta Hayvanlar:*\n`
        for (const a of sickAnimals) {
          message += `• ${a.earTag}${(a as any).name ? ` (${(a as any).name})` : ''}\n`
        }
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // /stok
    this.bot.onText(/\/stok/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      if (!this.isOwner(user)) {
        await this.bot.sendMessage(chatId, '❌ Bu komut için yetkiniz yok.')
        return
      }

      const stocks = await this.prisma.stock.findMany({
        where: { minQuantity: { not: null } },
        include: { category: true },
      })
      const low = stocks.filter((s: any) => s.minQuantity && s.quantity <= s.minQuantity)

      if (low.length === 0) {
        await this.bot.sendMessage(chatId, '✅ Tüm stok kalemleri normal seviyede!')
        return
      }

      let message = `📦 *Düşük Stok Uyarısı (${low.length} kalem):*\n\n`
      for (const s of low as any[]) {
        const icon = s.quantity === 0 ? '🚨' : '⚠️'
        message += `${icon} *${s.name}*: ${s.quantity} ${s.unit} _(min: ${s.minQuantity})_\n`
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // /finans
    this.bot.onText(/\/finans/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.requireUser(chatId)
      if (!user) return

      if (!this.isOwner(user)) {
        await this.bot.sendMessage(chatId, '❌ Bu komut için yetkiniz yok.')
        return
      }

      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const txs = await this.prisma.transaction.findMany({ where: { date: { gte: start } } })

      const income  = txs.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + Number(t.amount), 0)
      const expense = txs.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + Number(t.amount), 0)
      const profit  = income - expense

      const message =
        `💰 *Aylık Finans Özeti*\n` +
        `📅 ${now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}\n\n` +
        `📈 Gelir: *${income.toLocaleString('tr-TR')} ₺*\n` +
        `📉 Gider: *${expense.toLocaleString('tr-TR')} ₺*\n` +
        `💵 Net: *${profit >= 0 ? '+' : ''}${profit.toLocaleString('tr-TR')} ₺*\n\n` +
        `${profit >= 0 ? '✅ Karda' : '⚠️ Zararda'}`

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // Relay metin komutları
    const relayCommands: Record<string, { zone: string; relay: string; val: number; label: string; role: string }> = {
      '/sera_pompa_ac':      { zone: 'sera', relay: 'pompa', val: 1, label: '💧 Sera pompası açıldı',      role: 'tech' },
      '/sera_pompa_kapat':   { zone: 'sera', relay: 'pompa', val: 0, label: '💧 Sera pompası kapatıldı',   role: 'tech' },
      '/sera_fan_ac':        { zone: 'sera', relay: 'fan',   val: 1, label: '💨 Sera fanı açıldı',         role: 'tech' },
      '/sera_fan_kapat':     { zone: 'sera', relay: 'fan',   val: 0, label: '💨 Sera fanı kapatıldı',      role: 'tech' },
      '/sera_led_ac':        { zone: 'sera', relay: 'led',   val: 1, label: '💡 Sera LED açıldı',          role: 'tech' },
      '/sera_led_kapat':     { zone: 'sera', relay: 'led',   val: 0, label: '💡 Sera LED kapatıldı',       role: 'tech' },
      '/sera_isit_ac':       { zone: 'sera', relay: 'isit',  val: 1, label: '🔥 Isıtıcı açıldı',          role: 'tech' },
      '/sera_isit_kapat':    { zone: 'sera', relay: 'isit',  val: 0, label: '🔥 Isıtıcı kapatıldı',       role: 'tech' },
      '/ahir_fan_ac':        { zone: 'ahir', relay: 'fan',   val: 1, label: '💨 Ahır fanı açıldı',         role: 'barn' },
      '/ahir_fan_kapat':     { zone: 'ahir', relay: 'fan',   val: 0, label: '💨 Ahır fanı kapatıldı',      role: 'barn' },
      '/ahir_scraper_ac':    { zone: 'ahir', relay: 'scraper', val: 1, label: '🔄 Scraper başlatıldı',     role: 'barn' },
      '/ahir_scraper_kapat': { zone: 'ahir', relay: 'scraper', val: 0, label: '🔄 Scraper durduruldu',     role: 'barn' },
      '/ahir_yem_ver':       { zone: 'ahir', relay: 'yem',   val: 1, label: '🌾 Yem motoru çalıştırıldı (45sn)', role: 'barn' },
    }

    for (const [cmd, cfg] of Object.entries(relayCommands)) {
      this.bot.onText(new RegExp(`^${cmd.replace(/\//g, '\\/').replace(/_/g, '\\_?')}$`), async (msg) => {
        const chatId = msg.chat.id.toString()
        const user = await this.requireUser(chatId)
        if (!user) return

        const allowed = cfg.role === 'tech' ? this.isTech(user) : this.isBarn(user)
        if (!allowed) { await this.bot.sendMessage(chatId, '❌ Bu komut için yetkiniz yok.'); return }

        await this.sendRelay(chatId, cfg.zone, cfg.relay, cfg.val, cfg.label)
      })
    }

    // /tamamla_{id}
    this.bot.onText(/\/tamamla_(.+)/, async (msg, match) => {
      const chatId = msg.chat.id.toString()
      const taskId = match![1]
      const user = await this.requireUser(chatId)
      if (!user) return

      const task = await this.prisma.task.findFirst({ where: { id: taskId, assigneeId: user.id } })
      if (!task) { await this.bot.sendMessage(chatId, '❌ Görev bulunamadı veya size ait değil.'); return }

      await this.prisma.task.update({ where: { id: taskId }, data: { status: 'COMPLETED', completedAt: new Date() } })
      await this.bot.sendMessage(chatId,
        `✅ *"${task.title}"* tamamlandı!\n🕐 ${new Date().toLocaleTimeString('tr-TR')}`,
        { parse_mode: 'Markdown' })
    })

    // Callback query
    this.bot.on('callback_query', async (query) => {
      const data  = query.data || ''
      const chatId = query.message?.chat.id.toString() || ''
      const user  = await this.getUser(chatId)

      if (!user) { await this.bot.answerCallbackQuery(query.id, { text: 'Hesabınız bağlı değil.' }); return }

      // Relay: sera:pompa:1
      if (data.match(/^(sera|ahir):[a-z]+:\d$/)) {
        const parts = data.split(':')
        const zone  = parts[0]
        const relay = parts[1]
        const val   = parseInt(parts[2])

        const allowed = zone === 'sera' ? this.isTech(user) : this.isBarn(user)
        if (!allowed) { await this.bot.answerCallbackQuery(query.id, { text: '❌ Yetkiniz yok.' }); return }

        const relayId = RELAY_MAP[`${zone}:${relay}`]
        if (!relayId) { await this.bot.answerCallbackQuery(query.id, { text: 'Bilinmeyen röle.' }); return }

        const result = await this.esp32Post('/api/ctrl', { d: relayId, v: val })
        const label  = val ? 'açıldı' : 'kapatıldı'
        await this.bot.answerCallbackQuery(query.id, {
          text: result ? `✅ ${zone} ${relay} ${label}` : '❌ ESP32 bağlantı hatası'
        })
        return
      }

      // Yenile
      if (data === 'refresh:sera') {
        await this.bot.answerCallbackQuery(query.id, { text: '🔄 Yenileniyor...' })
        await this.handleSeraRefresh(chatId, query.message?.message_id)
        return
      }
      if (data === 'refresh:ahir') {
        await this.bot.answerCallbackQuery(query.id, { text: '🔄 Yenileniyor...' })
        await this.handleAhirRefresh(chatId, query.message?.message_id)
        return
      }

      // Görev tamamla
      if (data.startsWith('complete:')) {
        await this.handleTaskComplete(chatId, data.replace('complete:', ''), query)
      }
    })

    this.logger.log('Telegram komutları tanımlandı')
  }

  // ============================================================
  // REFRESH
  // ============================================================

  private async handleSeraRefresh(chatId: string, msgId?: number): Promise<void> {
    const data = await this.esp32Get('/api/data')
    if (!data || !msgId) return
    const s = data.sera || {}
    const text =
      `🌿 *Sera Durumu* _(güncellendi)_\n\n` +
      `🌡️ ${s.temp || '—'}°C  💧 ${s.hum || '—'}%\n` +
      `⚗️ pH: ${s.ph || '—'}  ⚡ EC: ${s.ec || '—'}\n` +
      `🔵 Tank: %${s.tank || '—'}\n\n` +
      `🕐 ${new Date().toLocaleTimeString('tr-TR')}`
    try { await this.bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown' }) } catch {}
  }

  private async handleAhirRefresh(chatId: string, msgId?: number): Promise<void> {
    const data = await this.esp32Get('/api/data')
    if (!data || !msgId) return
    const a = data.ahir || {}
    const text =
      `🐑 *Ahır Durumu* _(güncellendi)_\n\n` +
      `🌡️ ${a.temp || '—'}°C  💧 ${a.hum || '—'}%\n` +
      `☁️ NH₃: ${a.amonyak || '—'} ppm  🚶 ${a.har ? '🚨 Hareket VAR' : 'Sakin'}\n\n` +
      `🕐 ${new Date().toLocaleTimeString('tr-TR')}`
    try { await this.bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: 'Markdown' }) } catch {}
  }

  // ============================================================
  // DIŞ ÇAĞRI METOTLARİ
  // ============================================================

  async sendTaskAssignment(task: any): Promise<void> {
    const telegramId = task.assignee?.telegramId
    if (!telegramId || !this.bot) return

    const emoji = PRIORITY_EMOJI[task.priority] || '⚪'
    const dueDate = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'Belirtilmemiş'

    const message =
      `${emoji} *Yeni Görev Atandı!*\n\n` +
      `${TYPE_EMOJI[(task as any).type] || '📋'} *${task.title}*\n` +
      (task.description ? `📝 _${task.description}_\n\n` : '\n') +
      `📅 Son Tarih: ${dueDate}\n` +
      `🎯 Öncelik: ${task.priority}`

    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Tamamladım', callback_data: `complete:${task.id}` },
      ]]
    }

    try {
      const sent = await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown', reply_markup: keyboard })
      await this.prisma.task.update({ where: { id: task.id }, data: { telegramMsgId: sent.message_id.toString() } })
    } catch (err) {
      this.logger.error(`Görev bildirimi gönderilemedi [${telegramId}]`)
    }
  }

  async sendTaskCompleted(task: any): Promise<void> {
    const telegramId = task.createdBy?.telegramId
    if (!telegramId || !this.bot) return
    const completedBy = `${task.assignee?.name} ${task.assignee?.surname}`
    await this.sendMessage(telegramId,
      `✅ *Görev Tamamlandı!*\n\n📋 *${task.title}*\n👤 ${completedBy}\n🕐 ${new Date().toLocaleString('tr-TR')}`)
  }

  async sendMorningReport(telegramId: string, tasks: any[]): Promise<void> {
    if (!this.bot) return
    const criticals = tasks.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH')

    let message =
      `☀️ *Günaydın! Günlük Rapor*\n` +
      `📅 ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n` +
      `📋 Toplam Görev: *${tasks.length}*\n`

    if (criticals.length > 0) {
      message += `\n🔴 *Kritik Görevler:*\n`
      criticals.forEach(t => { message += `• ${PRIORITY_EMOJI[t.priority]} ${t.title}\n` })
    }

    message += `\n/gorevler — Detay`
    try { await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' }) } catch {}
  }

  async sendOverdueAlert(task: any): Promise<void> {
    const telegramId = task.createdBy?.telegramId
    if (!telegramId || !this.bot) return
    await this.sendMessage(telegramId,
      `⏰ *Geciken Görev!*\n\n${PRIORITY_EMOJI[task.priority]} *${task.title}*\n` +
      `📅 ${task.dueDate ? new Date(task.dueDate).toLocaleDateString('tr-TR') : '?'} \\(Geçti!\\)\n` +
      `👤 ${task.assignee?.name || 'Atanmamış'}`)
  }

  async sendAlarmNotification(telegramId: string, severity: 'warning' | 'critical', message: string): Promise<void> {
    const emoji = severity === 'critical' ? '🚨' : '⚠️'
    await this.sendMessage(telegramId, `${emoji} *${severity === 'critical' ? 'KRİTİK ALARM' : 'UYARI'}*\n\n${message}`)
  }

  async sendMessage(telegramId: string, message: string): Promise<void> {
    if (!this.bot) return
    try { await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' }) } catch {}
  }

  async updateTaskMessage(msgId: string, task: any): Promise<void> {
    const telegramId = task.assignee?.telegramId
    if (!telegramId || !this.bot || !msgId) return
    try {
      await this.bot.editMessageText(
        `✅ *TAMAMLANDI: ${task.title}*\n🕐 ${new Date().toLocaleString('tr-TR')}`,
        { chat_id: telegramId, message_id: parseInt(msgId), parse_mode: 'Markdown' })
    } catch {}
  }

  private async handleTaskComplete(chatId: string, taskId: string, query: any): Promise<void> {
    const user = await this.getUser(chatId)
    if (!user) return

    const task = await this.prisma.task.findFirst({ where: { id: taskId, assigneeId: user.id } })
    if (!task || task.status === 'COMPLETED') {
      await this.bot.answerCallbackQuery(query.id, { text: 'Bu görev zaten tamamlanmış.' })
      return
    }

    await this.prisma.task.update({ where: { id: taskId }, data: { status: 'COMPLETED', completedAt: new Date() } })
    await this.bot.answerCallbackQuery(query.id, { text: '✅ Görev tamamlandı!' })
    try {
      await this.bot.editMessageReplyMarkup(
        { inline_keyboard: [[{ text: '✅ Tamamlandı', callback_data: 'done' }]] },
        { chat_id: chatId, message_id: query.message?.message_id })
    } catch {}
    this.logger.log(`Görev Telegram'dan tamamlandı: ${task.title}`)
  }
}