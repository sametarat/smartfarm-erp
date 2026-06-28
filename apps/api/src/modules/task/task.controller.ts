import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return data ? req.user?.[data] : req.user;
});

@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TaskController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll(@Query('status') status?: string, @Query('assigneeId') assigneeId?: string) {
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (assigneeId) where.assigneeId = assigneeId;
    return this.prisma.task.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, surname: true } },
        createdBy: { select: { id: true, name: true, surname: true } },
        checklist: true,
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  @Get('today')
  async getToday() {
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    return this.prisma.task.findMany({
      where: { dueDate: { gte: today, lt: tomorrow }, status: { in: ['PENDING','IN_PROGRESS'] }, deletedAt: null },
      include: { assignee: { select: { id: true, name: true, surname: true } } },
      orderBy: { priority: 'desc' },
    });
  }

  @Get('stats')
  async getStats() {
    const today = new Date(); today.setHours(0,0,0,0);
    const [total, pending, completed] = await Promise.all([
      this.prisma.task.count({ where: { deletedAt: null } }),
      this.prisma.task.count({ where: { status: 'PENDING', deletedAt: null } }),
      this.prisma.task.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
    ]);
    return { total, pending, completed };
  }

  @Get('users-list')
  async getUsers() {
    return this.prisma.user.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true, name: true, surname: true, email: true },
      orderBy: { name: 'asc' },
    });
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: { assignee: { select: { id: true, name: true, surname: true } }, checklist: true },
    });
  }

  @Post()
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        type: body.type || 'GENERAL',
        priority: body.priority || 'MEDIUM',
        assigneeId: body.assigneeId || undefined,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        createdById: userId,
        tags: body.tags || [],
        photos: [],
        recurrenceDays: [],
      },
    });
  }

  @Patch(':id/complete')
  async complete(@Param('id') id: string, @Body() body: any) {
    return this.prisma.task.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date(), completionNote: body.note },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Silindi' };
  }
}