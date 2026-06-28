// ============================================================
// SmartFarm ERP — Task Service
// Görev CRUD, tekrarlayan görev, Telegram bildirim
// ============================================================

import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { PrismaService } from '../../../core/prisma/prisma.service'
import { TelegramService } from '../../telegram/services/telegram.service'
import {
  CreateTaskDto, UpdateTaskDto, CompleteTaskDto,
  TaskFilterDto, TaskStatus, TaskPriority, RecurrenceType,
} from '../dto/task.dto'

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
  ) {}

  // ============================================================
  // GÖREV OLUŞTUR
  // ============================================================

  async create(dto: CreateTaskDto, createdById: string) {
    const task = await this.prisma.task.create({
      data: {
        title:            dto.title,
        description:      dto.description,
        type:             dto.type || 'GENERAL',
        priority:         dto.priority || 'MEDIUM',
        status:           TaskStatus.PENDING,
        assigneeId:       dto.assigneeId,
        dueDate:          dto.dueDate ? new Date(dto.dueDate) : undefined,
        estimatedMinutes: dto.estimatedMinutes,
        farmZoneId:       dto.farmZoneId,
        animalId:         dto.animalId,
        tags:             dto.tags || [],
        recurrence:       dto.recurrence || RecurrenceType.NONE,
        recurrenceDays:   dto.recurrenceDays || [],
        createdById,
        checklist: dto.checklist ? {
          create: dto.checklist.map((item, idx) => ({
            title: item.title,
            completed: item.completed || false,
            order: idx,
          })),
        } : undefined,
      },
      include: {
        assignee:  { select: { id: true, name: true, surname: true, avatar: true, telegramId: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        farmZone:  { select: { id: true, name: true } },
        checklist: { orderBy: { order: 'asc' } },
      },
    })

    // Telegram bildirimi
    if (dto.notifyTelegram !== false && task.assignee?.telegramId) {
      await this.telegram.sendTaskAssignment(task).catch(e =>
        this.logger.error('Telegram bildirim hatası:', e)
      )
    }

    this.logger.log(`Görev oluşturuldu: "${task.title}" → ${task.assignee?.name || 'Atanmamış'}`)
    return task
  }

  // ============================================================
  // GÖREV LİSTESİ
  // ============================================================

  async findAll(filter: TaskFilterDto) {
    const page  = filter.page  || 1
    const limit = filter.limit || 20
    const skip  = (page - 1) * limit

    const where: any = { deletedAt: null }
    if (filter.status)      where.status     = filter.status
    if (filter.priority)    where.priority   = filter.priority
    if (filter.type)        where.type       = filter.type
    if (filter.assigneeId)  where.assigneeId = filter.assigneeId
    if (filter.dueDateFrom || filter.dueDateTo) {
      where.dueDate = {}
      if (filter.dueDateFrom) where.dueDate.gte = new Date(filter.dueDateFrom)
      if (filter.dueDateTo)   where.dueDate.lte = new Date(filter.dueDateTo)
    }

    const [data, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        include: {
          assignee:  { select: { id: true, name: true, surname: true, avatar: true } },
          createdBy: { select: { id: true, name: true, surname: true } },
          farmZone:  { select: { id: true, name: true } },
          checklist: { orderBy: { order: 'asc' } },
        },
        orderBy: [
          { priority: 'desc' },
          { dueDate:  'asc'  },
          { createdAt:'desc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ])

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  // ============================================================
  // GÖREV DETAY
  // ============================================================

  async findOne(id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignee:    { select: { id: true, name: true, surname: true, avatar: true } },
        createdBy:   { select: { id: true, name: true, surname: true } },
        farmZone:    { select: { id: true, name: true, type: true } },
        checklist:   { orderBy: { order: 'asc' } },
        attachments: true,
      },
    })

    if (!task) throw new NotFoundException('Görev bulunamadı')
    return task
  }

  // ============================================================
  // GÖREV GÜNCELLE
  // ============================================================

  async update(id: string, dto: UpdateTaskDto, userId: string) {
    const task = await this.findOne(id)

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.title        !== undefined && { title:       dto.title }),
        ...(dto.description  !== undefined && { description: dto.description }),
        ...(dto.status       !== undefined && { status:      dto.status }),
        ...(dto.priority     !== undefined && { priority:    dto.priority }),
        ...(dto.assigneeId   !== undefined && { assigneeId:  dto.assigneeId }),
        ...(dto.dueDate      !== undefined && { dueDate:     new Date(dto.dueDate) }),
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true, telegramId: true } },
      },
    })

    // Yeni atanan kişiye bildirim
    if (dto.assigneeId && dto.assigneeId !== task.assigneeId) {
      await this.telegram.sendTaskAssignment(updated).catch(() => {})
    }

    return updated
  }

  // ============================================================
  // GÖREV TAMAMLA
  // ============================================================

  async complete(id: string, dto: CompleteTaskDto, userId: string) {
    const task = await this.findOne(id)

    if (task.status === TaskStatus.COMPLETED) {
      throw new ForbiddenException('Görev zaten tamamlanmış')
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: {
        status:         TaskStatus.COMPLETED,
        completedAt:    new Date(),
        completionNote: dto.note,
        gpsLat:         dto.gpsLat,
        gpsLng:         dto.gpsLng,
        photos:         dto.photos || [],
        actualMinutes:  dto.actualMinutes,
      },
      include: {
        assignee:  { select: { id: true, name: true, surname: true, telegramId: true } },
        createdBy: { select: { id: true, name: true, surname: true, telegramId: true } },
      },
    })

    // Checklist'i tamamla
    await this.prisma.checklistItem.updateMany({
      where: { taskId: id },
      data:  { completed: true },
    })

    // Oluşturana bildirim
    if (updated.createdBy?.telegramId) {
      await this.telegram.sendTaskCompleted(updated).catch(() => {})
    }

    // Telegram mesajını güncelle
    if ((task as any).telegramMsgId) {
      await this.telegram.updateTaskMessage((task as any).telegramMsgId, updated).catch(() => {})
    }

    // Tekrarlayan görev → yeni oluştur
    if ((task as any).recurrence && (task as any).recurrence !== RecurrenceType.NONE) {
      await this.createRecurringTask(task).catch(e =>
        this.logger.error('Tekrarlayan görev oluşturulamadı:', e)
      )
    }

    this.logger.log(`Görev tamamlandı: "${task.title}"`)
    return updated
  }

  // ============================================================
  // GÖREV SİL (soft delete)
  // ============================================================

  async remove(id: string) {
    await this.findOne(id)
    await this.prisma.task.update({
      where: { id },
      data:  { deletedAt: new Date() },
    })
    return { message: 'Görev silindi' }
  }

  // ============================================================
  // CHECKLİST TOGGLE
  // ============================================================

  async toggleChecklistItem(taskId: string, itemId: string) {
    const item = await this.prisma.checklistItem.findFirst({
      where: { id: itemId, taskId },
    })
    if (!item) throw new NotFoundException('Checklist item bulunamadı')

    return this.prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        completed:   !item.completed,
        completedAt: !item.completed ? new Date() : null,
      },
    })
  }

  // ============================================================
  // BUGÜNKÜ GÖREVLER
  // ============================================================

  async getTodaysTasks() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return this.prisma.task.findMany({
      where: {
        dueDate:   { gte: today, lt: tomorrow },
        status:    { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        deletedAt: null,
      },
      include: {
        assignee: { select: { id: true, name: true, surname: true, avatar: true } },
      },
      orderBy: { priority: 'desc' },
    })
  }

  // ============================================================
  // İSTATİSTİKLER
  // ============================================================

  async getStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [total, pending, inProgress, completedToday, overdue] = await Promise.all([
      this.prisma.task.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { status: TaskStatus.PENDING, deletedAt: null } }),
      this.prisma.task.count({ where: { status: TaskStatus.IN_PROGRESS, deletedAt: null } }),
      this.prisma.task.count({
        where: { status: TaskStatus.COMPLETED, completedAt: { gte: today } }
      }),
      this.prisma.task.count({
        where: {
          dueDate:   { lt: new Date() },
          status:    { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
          deletedAt: null,
        }
      }),
    ])

    return { total, pending, inProgress, completedToday, overdue }
  }

  // ============================================================
  // SABAH GÖREV RAPORU (07:00)
  // ============================================================

  @Cron('0 7 * * *', { timeZone: 'Europe/Istanbul' })
  async sendMorningReport(): Promise<void> {
    this.logger.log('Sabah görev raporu gönderiliyor...')

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const tasks = await this.prisma.task.findMany({
      where: {
        dueDate:    { lte: tomorrow },
        status:     { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        deletedAt:  null,
        assigneeId: { not: null },
      },
      include: {
        assignee: { select: { id: true, name: true, telegramId: true } },
      },
      orderBy: { priority: 'desc' },
    })

    // Kullanıcıya göre grupla
    const byUser = new Map<string, typeof tasks>()
    for (const task of tasks) {
      const tid = task.assignee?.telegramId
      if (!tid) continue
      if (!byUser.has(tid)) byUser.set(tid, [])
      byUser.get(tid)!.push(task)
    }

    for (const [telegramId, userTasks] of byUser) {
      await this.telegram.sendMorningReport(telegramId, userTasks).catch(() => {})
    }

    this.logger.log(`Sabah raporu: ${byUser.size} kullanıcıya gönderildi`)
  }

  // ============================================================
  // GECİKEN GÖREV UYARISI (Her 2 saatte bir)
  // ============================================================

  @Cron('0 */2 * * *', { timeZone: 'Europe/Istanbul' })
  async checkOverdueTasks(): Promise<void> {
    const overdue = await this.prisma.task.findMany({
      where: {
        dueDate:  { lt: new Date() },
        status:   { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        deletedAt: null,
        priority: { in: [TaskPriority.HIGH, TaskPriority.CRITICAL] },
      },
      include: {
        assignee:  { select: { name: true, telegramId: true } },
        createdBy: { select: { telegramId: true } },
      },
    })

    for (const task of overdue) {
      if (task.createdBy?.telegramId) {
        await this.telegram.sendOverdueAlert(task).catch(() => {})
      }
    }

    if (overdue.length > 0) {
      this.logger.warn(`${overdue.length} geciken kritik görev uyarısı gönderildi`)
    }
  }

  // ============================================================
  // TEKRARLAYİÇ GÖREV
  // ============================================================

  private async createRecurringTask(originalTask: any): Promise<void> {
    const nextDate = new Date(originalTask.dueDate || new Date())

    switch (originalTask.recurrence) {
      case RecurrenceType.DAILY:   nextDate.setDate(nextDate.getDate() + 1);     break
      case RecurrenceType.WEEKLY:  nextDate.setDate(nextDate.getDate() + 7);     break
      case RecurrenceType.MONTHLY: nextDate.setMonth(nextDate.getMonth() + 1);   break
      default: return
    }

    await this.create({
      title:            originalTask.title,
      description:      originalTask.description,
      type:             originalTask.type,
      priority:         originalTask.priority,
      assigneeId:       originalTask.assigneeId,
      dueDate:          nextDate.toISOString(),
      estimatedMinutes: originalTask.estimatedMinutes,
      farmZoneId:       originalTask.farmZoneId,
      tags:             originalTask.tags,
      recurrence:       originalTask.recurrence,
      recurrenceDays:   originalTask.recurrenceDays,
      notifyTelegram:   true,
    }, originalTask.createdById)

    this.logger.log(`Tekrarlayan görev: "${originalTask.title}" → ${nextDate.toLocaleDateString('tr-TR')}`)
  }
}
