// ============================================================
// SmartFarm ERP — Task Controller
// ============================================================

import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger'
import { TaskService } from '../services/task.service'
import {
  CreateTaskDto, UpdateTaskDto, CompleteTaskDto, TaskFilterDto,
} from '../dto/task.dto'
import { AccessTokenGuard, RequirePermissions } from '../../auth/guards/auth.guard'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  // ============================================================
  // OLUŞTUR
  // ============================================================

  @Post()
  @RequirePermissions('task:create')
  @ApiOperation({ summary: 'Yeni görev oluştur' })
  @ApiResponse({ status: 201, description: 'Görev oluşturuldu' })
  async create(
    @Body() dto: CreateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.create(dto, userId)
  }

  // ============================================================
  // LİSTE
  // ============================================================

  @Get()
  @RequirePermissions('task:read')
  @ApiOperation({ summary: 'Görev listesi (filtreli, sayfalı)' })
  async findAll(@Query() filter: TaskFilterDto) {
    return this.taskService.findAll(filter)
  }

  // ============================================================
  // BUGÜNKÜ GÖREVLER
  // ============================================================

  @Get('today')
  @RequirePermissions('task:read')
  @ApiOperation({ summary: 'Bugünkü görevler (dashboard için)' })
  async getTodays() {
    return this.taskService.getTodaysTasks()
  }

  // ============================================================
  // İSTATİSTİK
  // ============================================================

  @Get('stats')
  @RequirePermissions('task:read')
  @ApiOperation({ summary: 'Görev istatistikleri' })
  async getStats() {
    return this.taskService.getStats()
  }

  // ============================================================
  // DETAY
  // ============================================================

  @Get(':id')
  @RequirePermissions('task:read')
  @ApiOperation({ summary: 'Görev detayı' })
  async findOne(@Param('id') id: string) {
    return this.taskService.findOne(id)
  }

  // ============================================================
  // GÜNCELLE
  // ============================================================

  @Put(':id')
  @RequirePermissions('task:update')
  @ApiOperation({ summary: 'Görev güncelle' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.update(id, dto, userId)
  }

  // ============================================================
  // TAMAMLA
  // ============================================================

  @Patch(':id/complete')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('task:update')
  @ApiOperation({ summary: 'Görevi tamamla (GPS, fotoğraf, not ile)' })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.complete(id, dto, userId)
  }

  // ============================================================
  // CHECKLİST TOGGLE
  // ============================================================

  @Patch(':id/checklist/:itemId')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions('task:update')
  @ApiOperation({ summary: 'Checklist item tamamla/geri al' })
  async toggleChecklist(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    return this.taskService.toggleChecklistItem(id, itemId)
  }

  // ============================================================
  // SİL
  // ============================================================

  @Delete(':id')
  @RequirePermissions('task:delete')
  @ApiOperation({ summary: 'Görevi sil (soft delete)' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.taskService.remove(id)
  }
}
