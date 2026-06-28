import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true, email: true, name: true, surname: true,
        status: true, avatar: true, telegramId: true,
        lastLoginAt: true, createdAt: true,
        role: { select: { id: true, name: true, displayName: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  @Get('roles')
  async getRoles() {
    return this.prisma.role.findMany({
      select: { id: true, name: true, displayName: true },
      orderBy: { displayName: 'asc' },
    });
  }

  @Post()
  async create(@Body() body: {
    email: string; name: string; surname: string;
    password: string; roleId: string; phone?: string;
  }) {
    const exists = await this.prisma.user.findUnique({ where: { email: body.email } });
    if (exists) throw new Error('Bu email zaten kayıtlı');
    const hash = await bcrypt.hash(body.password, 12);
    return this.prisma.user.create({
      data: {
        email: body.email,
        name: body.name,
        surname: body.surname,
        phone: body.phone,
        passwordHash: hash,
        roleId: body.roleId,
        status: 'ACTIVE',
      },
      select: {
        id: true, email: true, name: true, surname: true, status: true,
        role: { select: { id: true, name: true, displayName: true } },
      },
    });
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {};
    if (body.name)    data.name    = body.name;
    if (body.surname) data.surname = body.surname;
    if (body.roleId)  data.roleId  = body.roleId;
    if (body.status)  data.status  = body.status;
    if (body.telegramId !== undefined) data.telegramId = body.telegramId;
    if (body.password) data.passwordHash = await bcrypt.hash(body.password, 12);
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, email: true, name: true, surname: true, status: true,
        role: { select: { id: true, name: true, displayName: true } },
      },
    });
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE', deletedAt: new Date() },
    });
    return { message: 'Kullanıcı silindi' };
  }
}