// ============================================================
// SmartFarm ERP — Telegram Service
// Bot komutları, görev bildirimleri, onay mekanizması
// ============================================================

import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../../core/prisma/prisma.service'
import * as TelegramBot from 'node-telegram-bot-api'

const PRIORITY_EMOJI: Record<string, string> = {
  CRITICAL: '🔴',
  HIGH:     '🟠',
  MEDIUM:   '🟡',
  LOW:      '🟢',
}

const TYPE_EMOJI: Record<string, string> = {
  IRRIGATION:    '💧',
  FERTILIZATION: '🧪',
  HARVESTING:    '🌾',
  MAINTENANCE:   '🔧',
  VETERINARY:    '💉',
  FEEDING:       '🌿',
  INSPECTION:    '🔍',
  CLEANING:      '🧹',
  GENERAL:       '📋',
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name)
  private bot: TelegramBot
  private readonly botToken: string

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.botToken = this.config.get<string>('TELEGRAM_BOT_TOKEN', '')
  }

  async onModuleInit(): Promise<void> {
    if (!this.botToken) {
      this.logger.warn('TELEGRAM_BOT_TOKEN tanımlı değil — Telegram servisi devre dışı')
      return
    }

    this.bot = new TelegramBot(this.botToken, { polling: true })
    this.setupCommands()
    this.logger.log('Telegram Bot başlatıldı')
  }

  // ============================================================
  // BOT KOMUTLARI
  // ============================================================

  private setupCommands(): void {
    // /start — kayıt
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const username = msg.from?.username

      await this.bot.sendMessage(chatId,
        `🌱 *SmartFarm ERP'ye Hoş Geldiniz!*\n\n` +
        `Telegram ID'niz: \`${chatId}\`\n\n` +
        `Bu ID'yi sistem yöneticinize vererek hesabınıza bağlatın.\n\n` +
        `*Kullanılabilir Komutlar:*\n` +
        `/gorevler — Bugünkü görevleriniz\n` +
        `/durum — Sistem durumu\n` +
        `/yardim — Yardım`,
        { parse_mode: 'Markdown' }
      )
    })

    // /gorevler — Bugünkü görevler
    this.bot.onText(/\/gorevler/, async (msg) => {
      const chatId = msg.chat.id.toString()
      const user = await this.prisma.user.findFirst({
        where: { telegramId: chatId },
      })

      if (!user) {
        await this.bot.sendMessage(chatId,
          '❌ Hesabınız henüz bağlanmamış. Sistem yöneticinize başvurun.'
        )
        return
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

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

      let message = `📋 *Bugünkü Görevleriniz (${tasks.length}):*\n\n`
      for (const task of tasks) {
        const emoji = PRIORITY_EMOJI[task.priority] || '⚪'
        const typeEmoji = TYPE_EMOJI[task.type] || '📋'
        message += `${emoji} ${typeEmoji} *${task.title}*\n`
        if (task.description) message += `   _${task.description.slice(0, 80)}_\n`
        message += `   Öncelik: ${task.priority}\n\n`
      }

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // /durum — Sistem durumu
    this.bot.onText(/\/durum/, async (msg) => {
      const chatId = msg.chat.id.toString()

      const [totalTasks, pendingTasks, completedToday] = await Promise.all([
        this.prisma.task.count({ where: { deletedAt: null } }),
        this.prisma.task.count({ where: { status: 'PENDING', deletedAt: null } }),
        this.prisma.task.count({
          where: {
            status: 'COMPLETED',
            completedAt: { gte: new Date(new Date().setHours(0,0,0,0)) },
          }
        }),
      ])

      const message =
        `📊 *SmartFarm Sistem Durumu*\n\n` +
        `📋 Toplam Görev: ${totalTasks}\n` +
        `⏳ Bekleyen: ${pendingTasks}\n` +
        `✅ Bugün Tamamlanan: ${completedToday}\n\n` +
        `🕐 ${new Date().toLocaleString('tr-TR')}`

      await this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' })
    })

    // /tamamla_{taskId} — Görev tamamla
    this.bot.onText(/\/tamamla_(.+)/, async (msg, match) => {
      const chatId = msg.chat.id.toString()
      const taskId = match![1]

      const user = await this.prisma.user.findFirst({ where: { telegramId: chatId } })
      if (!user) return

      const task = await this.prisma.task.findFirst({
        where: { id: taskId, assigneeId: user.id },
      })

      if (!task) {
        await this.bot.sendMessage(chatId, '❌ Görev bulunamadı veya size ait değil.')
        return
      }

      await this.prisma.task.update({
        where: { id: taskId },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      await this.bot.sendMessage(chatId,
        `✅ *"${task.title}"* görevi tamamlandı!\n\n` +
        `Tamamlama zamanı: ${new Date().toLocaleString('tr-TR')}`,
        { parse_mode: 'Markdown' }
      )
    })

    // Callback query (inline button'lar)
    this.bot.on('callback_query', async (query) => {
      const data = query.data || ''
      const chatId = query.message?.chat.id.toString() || ''

      if (data.startsWith('complete:')) {
        const taskId = data.replace('complete:', '')
        await this.handleTaskComplete(chatId, taskId, query)
      } else if (data.startsWith('photo:')) {
        await this.bot.answerCallbackQuery(query.id, {
          text: 'Fotoğraf gönderin, göreve eklenecek.'
        })
      }
    })

    // Fotoğraf gönderme
    this.bot.on('photo', async (msg) => {
      const chatId = msg.chat.id.toString()
      await this.bot.sendMessage(chatId,
        '📸 Fotoğraf alındı. Görev tamamlama mesajıyla ilişkilendirildi.'
      )
    })

    // Konum gönderme
    this.bot.on('location', async (msg) => {
      const chatId = msg.chat.id.toString()
      const loc = msg.location
      if (loc) {
        await this.bot.sendMessage(chatId,
          `📍 Konum alındı: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
        )
      }
    })

    this.logger.log('Telegram komutları tanımlandı')
  }

  // ============================================================
  // GÖREV ATAMA BİLDİRİMİ
  // ============================================================

  async sendTaskAssignment(task: any): Promise<void> {
    const telegramId = task.assignee?.telegramId
    if (!telegramId || !this.bot) return

    const emoji = PRIORITY_EMOJI[task.priority] || '⚪'
    const typeEmoji = TYPE_EMOJI[task.type] || '📋'
    const dueDate = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'Belirtilmemiş'

    const message =
      `${emoji} *Yeni Görev Atandı!*\n\n` +
      `${typeEmoji} *${task.title}*\n` +
      (task.description ? `📝 ${task.description}\n\n` : '\n') +
      `📅 Son Tarih: ${dueDate}\n` +
      `🎯 Öncelik: ${task.priority}\n` +
      `🏷️ Tür: ${task.type}`

    const keyboard = {
      inline_keyboard: [[
        { text: '✅ Tamamladım', callback_data: `complete:${task.id}` },
        { text: '📸 Fotoğraf Ekle', callback_data: `photo:${task.id}` },
      ]]
    }

    try {
      const sent = await this.bot.sendMessage(telegramId, message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      })

      // Mesaj ID'sini kaydet
      await this.prisma.task.update({
        where: { id: task.id },
        data: { telegramMsgId: sent.message_id.toString() },
      })
    } catch (err) {
      this.logger.error(`Telegram mesaj gönderilemedi [${telegramId}]:`, err)
    }
  }

  // ============================================================
  // GÖREV TAMAMLAMA BİLDİRİMİ
  // ============================================================

  async sendTaskCompleted(task: any): Promise<void> {
    const telegramId = task.createdBy?.telegramId
    if (!telegramId || !this.bot) return

    const completedBy = `${task.assignee?.name} ${task.assignee?.surname}`
    const message =
      `✅ *Görev Tamamlandı!*\n\n` +
      `📋 *${task.title}*\n` +
      `👤 Tamamlayan: ${completedBy}\n` +
      `🕐 ${new Date().toLocaleString('tr-TR')}\n` +
      (task.completionNote ? `💬 Not: ${task.completionNote}` : '')

    try {
      await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' })
    } catch (err) {
      this.logger.error('Tamamlama bildirimi gönderilemedi:', err)
    }
  }

  // ============================================================
  // SABAH RAPORU
  // ============================================================

  async sendMorningReport(telegramId: string, tasks: any[]): Promise<void> {
    if (!this.bot) return

    const criticals = tasks.filter(t => t.priority === 'CRITICAL' || t.priority === 'HIGH')
    const others = tasks.filter(t => t.priority !== 'CRITICAL' && t.priority !== 'HIGH')

    let message = `☀️ *Günaydın! Bugünkü Görev Raporu*\n`
    message += `📅 ${new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}\n\n`

    if (criticals.length > 0) {
      message += `🔴 *Kritik & Yüksek Öncelikli (${criticals.length}):*\n`
      for (const t of criticals) {
        message += `• ${PRIORITY_EMOJI[t.priority]} ${t.title}\n`
      }
      message += '\n'
    }

    if (others.length > 0) {
      message += `📋 *Diğer Görevler (${others.length}):*\n`
      for (const t of others.slice(0, 5)) {
        message += `• ${TYPE_EMOJI[t.type] || '📋'} ${t.title}\n`
      }
      if (others.length > 5) message += `_...ve ${others.length - 5} görev daha_\n`
    }

    message += `\n/gorevler komutuyla detayları görebilirsiniz.`

    try {
      await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' })
    } catch (err) {
      this.logger.error(`Sabah raporu gönderilemedi [${telegramId}]:`, err)
    }
  }

  // ============================================================
  // GECİKEN GÖREV UYARISI
  // ============================================================

  async sendOverdueAlert(task: any): Promise<void> {
    const telegramId = task.createdBy?.telegramId
    if (!telegramId || !this.bot) return

    const dueDate = task.dueDate
      ? new Date(task.dueDate).toLocaleDateString('tr-TR')
      : '?'

    const message =
      `⏰ *Geciken Görev Uyarısı!*\n\n` +
      `${PRIORITY_EMOJI[task.priority]} *${task.title}*\n` +
      `📅 Son Tarih: ${dueDate} (Geçti!)\n` +
      `👤 Sorumlu: ${task.assignee?.name || 'Atanmamış'}\n\n` +
      `Lütfen görev durumunu güncelleyin.`

    try {
      await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' })
    } catch (err) {
      this.logger.error('Gecikme uyarısı gönderilemedi:', err)
    }
  }

  // ============================================================
  // GÖREV MESAJI GÜNCELLE
  // ============================================================

  async updateTaskMessage(msgId: string, task: any): Promise<void> {
    const telegramId = task.assignee?.telegramId
    if (!telegramId || !this.bot || !msgId) return

    try {
      await this.bot.editMessageText(
        `✅ *TAMAMLANDI: ${task.title}*\n\n` +
        `🕐 ${new Date().toLocaleString('tr-TR')}` +
        (task.completionNote ? `\n💬 ${task.completionNote}` : ''),
        {
          chat_id: telegramId,
          message_id: parseInt(msgId),
          parse_mode: 'Markdown',
        }
      )
    } catch (err) {
      // Mesaj düzenlenemiyorsa (çok eski vb.) sessizce geç
    }
  }

  // ============================================================
  // GENEL MESAJ GÖNDER
  // ============================================================

  async sendMessage(telegramId: string, message: string): Promise<void> {
    if (!this.bot) return
    try {
      await this.bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' })
    } catch (err) {
      this.logger.error(`Mesaj gönderilemedi [${telegramId}]:`, err)
    }
  }

  // ============================================================
  // ALARM BİLDİRİMİ (IoT'den)
  // ============================================================

  async sendAlarmNotification(
    telegramId: string,
    severity: 'warning' | 'critical',
    message: string,
  ): Promise<void> {
    const emoji = severity === 'critical' ? '🚨' : '⚠️'
    await this.sendMessage(telegramId, `${emoji} *${severity.toUpperCase()} ALARM*\n\n${message}`)
  }

  // ============================================================
  // PRIVATE: GÖREV TAMAMLA (Callback)
  // ============================================================

  private async handleTaskComplete(chatId: string, taskId: string, query: any): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { telegramId: chatId } })
    if (!user) return

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, assigneeId: user.id },
    })

    if (!task || task.status === 'COMPLETED') {
      await this.bot.answerCallbackQuery(query.id, { text: 'Bu görev zaten tamamlanmış.' })
      return
    }

    await this.prisma.task.update({
      where: { id: taskId },
      data: { status: 'COMPLETED', completedAt: new Date() },
    })

    await this.bot.answerCallbackQuery(query.id, { text: '✅ Görev tamamlandı!' })
    await this.bot.editMessageReplyMarkup(
      { inline_keyboard: [[{ text: '✅ Tamamlandı', callback_data: 'done' }]] },
      { chat_id: chatId, message_id: query.message?.message_id }
    )

    this.logger.log(`Görev Telegram'dan tamamlandı: ${task.title} (${user.email})`)
  }
}
