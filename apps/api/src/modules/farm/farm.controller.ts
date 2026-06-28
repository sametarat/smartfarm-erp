import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('farm')
export class FarmController {
  constructor(private prisma: PrismaService) {}

  // ── Bölgeler ─────────────────────────────────────────────────
  @Get('zones')
  async getZones() {
    return this.prisma.farmZone.findMany({
      include: {
        crops:   { where: { status: { in: ['PLANNED','GROWING'] } }, take: 5 },
        devices: { select: { id: true, name: true, isOnline: true } },
        _count:  { select: { crops: true, animals: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Post('zones')
  async createZone(@Body() body: any) {
    return this.prisma.farmZone.create({
      data: {
        name:        body.name,
        type:        body.type || 'GREENHOUSE',
        description: body.description,
        area:        body.area ? parseFloat(body.area) : undefined,
        farmId:      body.farmId,
      },
    });
  }

  // ── Ürünler ──────────────────────────────────────────────────
  @Get('crops')
  async getCrops(@Query('status') status?: string, @Query('zoneId') zoneId?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (zoneId) where.zoneId = zoneId;
    return this.prisma.crop.findMany({
      where,
      include: {
        zone:     { select: { id: true, name: true, type: true } },
        harvests: { orderBy: { harvestedAt: 'desc' }, take: 3 },
        _count:   { select: { harvests: true, irrigations: true } },
      },
      orderBy: { plantDate: 'desc' },
    });
  }

  @Get('crops/stats')
  async getCropStats() {
    const [total, growing, harvested] = await Promise.all([
      this.prisma.crop.count(),
      this.prisma.crop.count({ where: { status: 'GROWING' } }),
      this.prisma.crop.count({ where: { status: 'HARVESTED' } }),
    ]);
    const totalHarvest = await this.prisma.harvest.aggregate({
      _sum: { quantity: true },
    });
    return { total, growing, harvested, totalHarvestKg: totalHarvest._sum.quantity || 0 };
  }

  @Post('crops')
  async createCrop(@Body() body: any) {
    return this.prisma.crop.create({
      data: {
        name:            body.name,
        variety:         body.variety,
        plantDate:       body.plantDate       ? new Date(body.plantDate)       : undefined,
        expectedHarvest: body.expectedHarvest ? new Date(body.expectedHarvest) : undefined,
        status:          body.status || 'GROWING',
        area:            body.area   ? parseFloat(body.area) : undefined,
        notes:           body.notes,
        zoneId:          body.zoneId,
      },
      include: { zone: { select: { id: true, name: true } } },
    });
  }

  @Put('crops/:id')
  async updateCrop(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.notes  !== undefined) data.notes  = body.notes;
    if (body.actualHarvest) data.actualHarvest = new Date(body.actualHarvest);
    return this.prisma.crop.update({ where: { id }, data });
  }

  @Delete('crops/:id')
  async deleteCrop(@Param('id') id: string) {
    await this.prisma.crop.delete({ where: { id } });
    return { message: 'Ürün silindi' };
  }

  // ── Hasat ────────────────────────────────────────────────────
  @Post('crops/:id/harvests')
  async addHarvest(@Param('id') cropId: string, @Body() body: any) {
    const harvest = await this.prisma.harvest.create({
      data: {
        cropId,
        quantity:    parseFloat(body.quantity),
        unit:        body.unit || 'kg',
        quality:     body.quality,
        price:       body.price ? parseFloat(body.price) : undefined,
        notes:       body.notes,
        harvestedAt: body.harvestedAt ? new Date(body.harvestedAt) : new Date(),
      },
    });
    await this.prisma.crop.update({
      where: { id: cropId },
      data:  { status: 'HARVESTED', actualHarvest: new Date() },
    });
    return harvest;
  }

  // ── Sulama ───────────────────────────────────────────────────
  @Post('crops/:id/irrigations')
  async addIrrigation(@Param('id') cropId: string, @Body() body: any) {
    return this.prisma.irrigation.create({
      data: {
        cropId,
        amount:      parseFloat(body.amount),
        unit:        body.unit || 'litre',
        duration:    body.duration ? parseInt(body.duration) : undefined,
        ph:          body.ph    ? parseFloat(body.ph)  : undefined,
        ec:          body.ec    ? parseFloat(body.ec)  : undefined,
        notes:       body.notes,
        irrigatedAt: body.irrigatedAt ? new Date(body.irrigatedAt) : new Date(),
      },
    });
  }

  // ── Gübreleme ────────────────────────────────────────────────
  @Post('crops/:id/fertilizations')
  async addFertilization(@Param('id') cropId: string, @Body() body: any) {
    return this.prisma.fertilization.create({
      data: {
        cropId,
        fertilizerName: body.fertilizerName,
        amount:         parseFloat(body.amount),
        unit:           body.unit || 'ml',
        notes:          body.notes,
        fertilizedAt:   body.fertilizedAt ? new Date(body.fertilizedAt) : new Date(),
      },
    });
  }
}