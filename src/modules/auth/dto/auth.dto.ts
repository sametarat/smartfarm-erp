import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class LoginDto {
  @ApiProperty({ example: 'admin@smartfarm.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  password: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twoFACode?: string
}

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string

  @ApiProperty()
  @IsString()
  name: string

  @ApiProperty()
  @IsString()
  surname: string

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string
}
