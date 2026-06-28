import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('crm')
export class CrmController {
  constructor(private prisma: PrismaService) {}

  @Get('contacts')
  async getAll(
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    const where: any = { deletedAt: null, isActive: true };
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { name:    { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone:   { contains: search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.contact.findMany({
      where,
      include: {
        notes_rel:    { orderBy: { createdAt: 'desc' }, take: 3 },
        transactions: { orderBy: { date: 'desc' }, take: 3,
          select: { id: true, type: true, amount: true, date: true, description: true }
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Post('contacts')
  async create(@Body() body: any) {
    return this.prisma.contact.create({
      data: {
        type:    body.type    || 'OTHER',
        name:    body.name,
        company: body.company,
        email:   body.email,
        phone:   body.phone,
        address: body.address,
        taxNo:   body.taxNo,
        notes:   body.notes,
        tags:    body.tags || [],
      },
    });
  }

  @Put('contacts/:id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.name    !== undefined) data.name    = body.name;
    if (body.company !== undefined) data.company = body.company;
    if (body.email   !== undefined) data.email   = body.email;
    if (body.phone   !== undefined) data.phone   = body.phone;
    if (body.address !== undefined) data.address = body.address;
    if (body.notes   !== undefined) data.notes   = body.notes;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    return this.prisma.contact.update({ where: { id }, data });
  }

  @Delete('contacts/:id')
  async remove(@Param('id') id: string) {
    await this.prisma.contact.update({
      where: { id },
      data:  { deletedAt: new Date(), isActive: false },
    });
    return { message: 'Kişi silindi' };
  }

  @Post('contacts/:id/notes')
  async addNote(@Param('id') contactId: string, @Body() body: any) {
    return this.prisma.contactNote.create({
      data: { content: body.content, contactId },
    });
  }
}