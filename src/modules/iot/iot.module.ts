// ============================================================
// SmartFarm ERP — IoT & SCADA Modülleri
// ============================================================

import { Module } from '@nestjs/common'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { JwtModule } from '@nestjs/jwt'
import { ConfigModule, ConfigService } from '@nestjs/config'

// ============================================================
// MQTT MODULE
// ============================================================

import { MqttService } from '../../core/mqtt/mqtt.service'

// ============================================================
// IOT MODULE
// ============================================================

import { IotDeviceService } from './services/iot-device.service'
import { IotController, ScadaController } from './controllers/iot.controller'
import { ScadaGateway } from '../scada/gateways/scada.gateway'

// Prisma servisi için mock (gerçek uygulamada global module'dan gelir)
import { PrismaService } from '../../core/prisma/prisma.service'

export const IotModule = {
  module: class IotModule {},
  imports: [
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 20,
    }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [IotController, ScadaController],
  providers: [IotDeviceService, MqttService, ScadaGateway, PrismaService],
  exports: [IotDeviceService, MqttService, ScadaGateway],
}

// ============================================================
// PRISMA SERVICE (Core)
// ============================================================

// FILE: src/core/prisma/prisma.service.ts
/*
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(config: ConfigService) {
    super({
      datasources: { db: { url: config.get('DATABASE_URL') } },
      log: config.get('NODE_ENV') === 'development' ? ['query', 'error'] : ['error'],
    })
  }
  async onModuleInit() { await this.$connect() }
  async onModuleDestroy() { await this.$disconnect() }
}
*/

// ============================================================
// APP MODULE (Ana modül entegrasyon örneği)
// ============================================================

// FILE: src/app.module.ts
/*
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule } from '@nestjs/throttler'
import { AuthModule } from './modules/auth/auth.module'
import { IotModule } from './modules/iot/iot.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    AuthModule,
    IotModule,
  ],
})
export class AppModule {}
*/

// ============================================================
// ESP32 v5 MQTT PAYLOAD FORMAT (Referans)
// ============================================================
/*
// ESP32'nin gönderdiği sensör verisi formatı:
// Topic: smartfarm/default/device/{MAC}/sensors

{
  "mac": "AA:BB:CC:DD:EE:FF",
  "readings": {
    "temp": 24.5,
    "hum": 68.2,
    "ph": 6.1,
    "ec": 1.23,
    "tank": 74,
    "ammonia": 12
  },
  "rssi": -65,
  "timestamp": "2026-06-27T10:30:00Z"
}

// Cihaz durumu:
// Topic: smartfarm/default/device/{MAC}/status
{
  "mac": "AA:BB:CC:DD:EE:FF",
  "online": true,
  "rssi": -65,
  "firmwareVer": "v5.1",
  "freeHeap": 45000,
  "uptime": 3600
}

// Röle durumu:
// Topic: smartfarm/default/device/{MAC}/relay/state
{
  "relayStates": {
    "sera_pompa": false,
    "sera_fan": true,
    "sera_led": true,
    "sera_isitici": false
  }
}
*/
