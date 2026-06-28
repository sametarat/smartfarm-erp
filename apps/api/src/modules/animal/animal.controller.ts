import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('animals')
export class AnimalController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll(@Query('status') status?: string, @Query('species') species?: string) {
    const where: any = { deletedAt: null };
    if (status)  where.status  = status;
    if (species) where.species = species;
    return this.prisma.animal.findMany({
      where,
      include: {
        zone:         { select: { id: true, name: true } },
        vaccinations: { orderBy: { vaccinatedAt: 'desc' }, take: 1 },
        weightLogs:   { orderBy: { measuredAt:   'desc' }, take: 1 },
        pregnancies:  { orderBy: { createdAt:    'desc' }, take: 1 },
      },
      orderBy: { earTag: 'asc' },
    });
  }

  @Get('stats')
  async getStats() {
    const [total, healthy, pregnant, sick] = await Promise.all([
      this.prisma.animal.count({ where: { deletedAt: null } }),
      this.prisma.animal.count({ where: { status: 'HEALTHY',    deletedAt: null } }),
      this.prisma.animal.count({ where: { status: 'PREGNANT',   deletedAt: null } }),
      this.prisma.animal.count({ where: { status: 'SICK',       deletedAt: null } }),
    ]);
    return { total, healthy, pregnant, sick };
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.prisma.animal.findFirst({
      where: { id, deletedAt: null },
      include: {
        zone:         true,
        vaccinations: { orderBy: { vaccinatedAt: 'desc' } },
        weightLogs:   { orderBy: { measuredAt:   'desc' } },
        pregnancies:  { orderBy: { createdAt:    'desc' } },
        treatments:   { orderBy: { treatedAt:    'desc' } },
        feedLogs:     { orderBy: { fedAt:        'desc' }, take: 30 },
      },
    });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.animal.create({
      data: {
        earTag:    body.earTag,
        rfid:      body.rfid,
        name:      body.name,
        species:   body.species   || 'Koyun',
        breed:     body.breed     || 'Ile de France',
        gender:    body.gender    || 'FEMALE',
        birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
        weight:    body.weight    ? parseFloat(body.weight)  : undefined,
        status:    body.status    || 'HEALTHY',
        notes:     body.notes,
        zoneId:    body.zoneId,
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.name   !== undefined) data.name   = body.name;
    if (body.status !== undefined) data.status = body.status;
    if (body.weight !== undefined) data.weight = parseFloat(body.weight);
    if (body.notes  !== undefined) data.notes  = body.notes;
    if (body.zoneId !== undefined) data.zoneId = body.zoneId;
    return this.prisma.animal.update({ where: { id }, data });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.animal.update({ where: { id }, data: { deletedAt: new Date() } });
    return { message: 'Hayvan silindi' };
  }

  // ── Aşı ──────────────────────────────────────────────────────
  @Post(':id/vaccinations')
  async addVaccination(@Param('id') animalId: string, @Body() body: any) {
    return this.prisma.vaccination.create({
      data: {
        animalId,
        vaccineName:  body.vaccineName,
        dose:         body.dose       ? parseFloat(body.dose) : undefined,
        unit:         body.unit,
        nextDue:      body.nextDue    ? new Date(body.nextDue)    : undefined,
        veterinary:   body.veterinary,
        notes:        body.notes,
        vaccinatedAt: body.vaccinatedAt ? new Date(body.vaccinatedAt) : new Date(),
      },
    });
  }

  // ── Kilo ──────────────────────────────────────────────────────
  @Post(':id/weights')
  async addWeight(@Param('id') animalId: string, @Body() body: any) {
    const log = await this.prisma.weightLog.create({
      data: {
        animalId,
        weight:     parseFloat(body.weight),
        unit:       body.unit || 'kg',
        notes:      body.notes,
        measuredAt: body.measuredAt ? new Date(body.measuredAt) : new Date(),
      },
    });
    await this.prisma.animal.update({
      where: { id: animalId },
      data:  { weight: parseFloat(body.weight) },
    });
    return log;
  }

  // ── Yem ──────────────────────────────────────────────────────
  @Post(':id/feeds')
  async addFeed(@Param('id') animalId: string, @Body() body: any) {
    return this.prisma.feedLog.create({
      data: {
        animalId,
        feedType: body.feedType,
        amount:   parseFloat(body.amount),
        unit:     body.unit || 'kg',
        notes:    body.notes,
        fedAt:    body.fedAt ? new Date(body.fedAt) : new Date(),
      },
    });
  }

  // ── Tedavi ───────────────────────────────────────────────────
  @Post(':id/treatments')
  async addTreatment(@Param('id') animalId: string, @Body() body: any) {
    if (body.status) {
      await this.prisma.animal.update({
        where: { id: animalId },
        data:  { status: body.status },
      });
    }
    return this.prisma.treatment.create({
      data: {
        animalId,
        diagnosis:  body.diagnosis,
        medicine:   body.medicine,
        dose:       body.dose      ? parseFloat(body.dose)  : undefined,
        unit:       body.unit,
        duration:   body.duration  ? parseInt(body.duration) : undefined,
        veterinary: body.veterinary,
        cost:       body.cost      ? parseFloat(body.cost)   : undefined,
        notes:      body.notes,
        treatedAt:  body.treatedAt ? new Date(body.treatedAt) : new Date(),
      },
    });
  }

  // ── Doğum ────────────────────────────────────────────────────
  @Post(':id/births')
  async addBirth(@Param('id') animalId: string, @Body() body: any) {
    const pregnancy = await this.prisma.pregnancy.findFirst({
      where: { animalId, actualBirth: null },
      orderBy: { createdAt: 'desc' },
    });

    if (pregnancy) {
      await this.prisma.pregnancy.update({
        where: { id: pregnancy.id },
        data: {
          actualBirth:    new Date(body.birthDate || new Date()),
          offspringCount: parseInt(body.offspringCount || '1'),
          offspringAlive: parseInt(body.offspringAlive || body.offspringCount || '1'),
          notes:          body.notes,
        },
      });
    }

    await this.prisma.animal.update({
      where: { id: animalId },
      data:  { status: 'HEALTHY' },
    });

    const offspring = [];
    const count = parseInt(body.offspringAlive || body.offspringCount || '1');
    for (let i = 0; i < count; i++) {
      const earTag = body.offspringEarTags?.[i] || `${body.earTagPrefix || 'YV'}-${Date.now()}-${i + 1}`;
      const animal = await this.prisma.animal.create({
        data: {
          earTag,
          species:   body.species          || 'Koyun',
          breed:     body.breed            || 'Ile de France',
          gender:    body.offspringGenders?.[i] || 'FEMALE',
          birthDate: new Date(body.birthDate || new Date()),
          weight:    body.offspringWeight  ? parseFloat(body.offspringWeight) : undefined,
          status:    'HEALTHY',
          notes:     `Anne küpe: ${animalId}`,
          zoneId:    body.zoneId,
        },
      });
      offspring.push(animal);
    }

    return { pregnancy, offspring };
  }
}