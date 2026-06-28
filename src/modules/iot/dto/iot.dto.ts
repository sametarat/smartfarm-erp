// ============================================================
// SmartFarm ERP — IoT Device DTOs
// ESP32 kayıt, sensör verisi, röle komutu
// ============================================================

import {
  IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional,
  IsEnum, IsArray, ValidateNested, Min, Max, IsIP,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ============================================================
// ENUMS
// ============================================================

export enum DeviceType {
  ESP32     = 'ESP32',
  SENSOR    = 'SENSOR',
  RELAY     = 'RELAY',
  CAMERA    = 'CAMERA',
  GATEWAY   = 'GATEWAY',
}

export enum SensorType {
  TEMPERATURE   = 'TEMPERATURE',
  HUMIDITY      = 'HUMIDITY',
  PH            = 'PH',
  EC            = 'EC',
  AMMONIA       = 'AMMONIA',
  WATER_LEVEL   = 'WATER_LEVEL',
  CO2           = 'CO2',
  LIGHT         = 'LIGHT',
  SOIL_MOISTURE = 'SOIL_MOISTURE',
  MOTION        = 'MOTION',
}

export enum ZoneType {
  GREENHOUSE = 'GREENHOUSE',
  FIELD      = 'FIELD',
  BARN       = 'BARN',
  STORAGE    = 'STORAGE',
}

// ============================================================
// DEVICE REGISTER (ESP32 → API)
// ============================================================

export class DeviceRegisterDto {
  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsString()
  @IsNotEmpty()
  mac: string

  @ApiProperty({ example: 'Sera-ESP32-A' })
  @IsString()
  @IsNotEmpty()
  name: string

  @ApiProperty({ enum: DeviceType })
  @IsEnum(DeviceType)
  type: DeviceType

  @ApiPropertyOptional({ example: 'v5.1' })
  @IsOptional()
  @IsString()
  firmwareVer?: string

  @ApiPropertyOptional({ example: '192.168.1.101' })
  @IsOptional()
  @IsString()
  ipAddress?: string

  @ApiPropertyOptional({ example: -65 })
  @IsOptional()
  @IsNumber()
  rssi?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  farmZoneId?: string

  @ApiPropertyOptional({ description: 'Sensör tanımları' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SensorConfigDto)
  sensors?: SensorConfigDto[]
}

export class SensorConfigDto {
  @IsString()
  name: string

  @IsEnum(SensorType)
  type: SensorType

  @IsString()
  unit: string

  @IsOptional()
  @IsNumber()
  minAlert?: number

  @IsOptional()
  @IsNumber()
  maxAlert?: number

  @IsOptional()
  @IsNumber()
  pin?: number
}

// ============================================================
// SENSOR READING (ESP32 → MQTT → API)
// ============================================================

export class SensorReadingDto {
  @ApiProperty({ example: 'AA:BB:CC:DD:EE:FF' })
  @IsString()
  mac: string

  @ApiProperty({
    example: {
      temp: 24.5,
      hum: 68.2,
      ph: 6.1,
      ec: 1.23,
      tank: 74,
      ammonia: 12,
    }
  })
  readings: Record<string, number>

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  rssi?: number

  @ApiPropertyOptional()
  @IsOptional()
  timestamp?: string
}

// ============================================================
// RELAY COMMAND (API → MQTT → ESP32)
// ============================================================

export class RelayCommandDto {
  @ApiProperty({ example: 'sera_pompa' })
  @IsString()
  @IsNotEmpty()
  relayId: string

  @ApiProperty({ example: true })
  @IsBoolean()
  state: boolean

  @ApiPropertyOptional({ description: 'Otomatik kapanma süresi (saniye)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(86400)
  autoOffSeconds?: number
}

// ============================================================
// DEVICE STATUS UPDATE (ESP32 → MQTT)
// ============================================================

export class DeviceStatusDto {
  @IsString()
  mac: string

  @IsBoolean()
  online: boolean

  @IsOptional()
  @IsNumber()
  rssi?: number

  @IsOptional()
  @IsNumber()
  batteryLevel?: number

  @IsOptional()
  @IsString()
  firmwareVer?: string

  @IsOptional()
  relayStates?: Record<string, boolean>
}

// ============================================================
// OTA UPDATE
// ============================================================

export class OtaUpdateDto {
  @ApiProperty({ description: 'Firmware URL' })
  @IsString()
  @IsNotEmpty()
  firmwareUrl: string

  @ApiProperty({ example: 'v5.2' })
  @IsString()
  version: string

  @ApiPropertyOptional({ description: 'Güncelleme notları' })
  @IsOptional()
  @IsString()
  notes?: string
}

// ============================================================
// SENSOR HISTORY QUERY
// ============================================================

export class SensorHistoryQueryDto {
  @ApiPropertyOptional({ description: 'Başlangıç tarihi', example: '2026-01-01T00:00:00Z' })
  @IsOptional()
  @IsString()
  from?: string

  @ApiPropertyOptional({ description: 'Bitiş tarihi' })
  @IsOptional()
  @IsString()
  to?: string

  @ApiPropertyOptional({ enum: SensorType })
  @IsOptional()
  @IsEnum(SensorType)
  sensorType?: SensorType

  @ApiPropertyOptional({ description: 'Veri noktası limiti', default: 100 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  limit?: number = 100

  @ApiPropertyOptional({ description: 'Gruplama (1m, 5m, 1h, 1d)', default: '5m' })
  @IsOptional()
  @IsString()
  interval?: string = '5m'
}
