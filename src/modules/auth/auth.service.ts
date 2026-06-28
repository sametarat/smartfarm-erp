import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../../core/prisma/prisma.service'
import * as bcrypt from 'bcryptjs'
import { LoginDto, RegisterDto } from './dto/auth.dto'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { role: { include: { permissions: true } } },
    })

    if (!user) throw new UnauthorizedException('Email veya sifre hatali')

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException('Email veya sifre hatali')

    if (user.status !== 'ACTIVE') throw new UnauthorizedException('Hesabiniz aktif degil')

    const token = this.jwtService.sign({ sub: user.id, email: user.email, roleId: user.roleId })

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        surname: user.surname,
        role: {
          id: user.role.id,
          name: user.role.name,
          displayName: user.role.displayName,
          permissions: user.role.permissions.map(p => ({
            module: p.module, action: p.action, resource: p.resource,
          })),
        },
        twoFAEnabled: user.twoFAEnabled,
      },
    }
  }

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (exists) throw new ConflictException('Bu email zaten kayitli')

    const guestRole = await this.prisma.role.findFirst({ where: { name: 'GUEST' } })
    if (!guestRole) throw new BadRequestException('Sistem rolleri tanimlanmamis')

    const hash = await bcrypt.hash(dto.password, 12)
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        surname: dto.surname,
        passwordHash: hash,
        roleId: guestRole.id,
        status: 'ACTIVE',
      },
      include: { role: { include: { permissions: true } } },
    })

    const token = this.jwtService.sign({ sub: user.id, email: user.email, roleId: user.roleId })
    return { accessToken: token, user: { id: user.id, email: user.email, name: user.name, surname: user.surname } }
  }

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: { include: { permissions: true } } },
      omit: { passwordHash: true, twoFASecret: true },
    })
  }
}
