import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });
    if (!user) throw new UnauthorizedException('Email veya sifre hatali');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Email veya sifre hatali');
    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    return {
      accessToken: token,
      refreshToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        twoFAEnabled: user.twoFAEnabled,
        role: {
          id: user.role.id,
          name: user.role.name,
          displayName: user.role.displayName,
          permissions: user.role.permissions.map(p => ({
            module: p.module,
            action: p.action,
            resource: p.resource,
          })),
        },
      },
    };
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
    });
  }
}