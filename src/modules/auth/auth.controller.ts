import { Controller, Post, Get, Body, UseGuards, HttpCode } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { AuthService } from './auth.service'
import { LoginDto, RegisterDto } from './dto/auth.dto'
import { JwtAuthGuard, Public } from './guards/jwt.guard'
import { CurrentUser } from './decorators/current-user.decorator'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Giris yap' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto)
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Kayit ol' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut kullanici' })
  getMe(@CurrentUser('id') userId: string) {
    return this.authService.getMe(userId)
  }
}
