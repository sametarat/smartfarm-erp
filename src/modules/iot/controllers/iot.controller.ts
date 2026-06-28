// ============================================================
// SmartFarm ERP — IoT Controller
// Cihaz yönetimi REST endpointleri
// ============================================================

import {
  Controller, Get, Post, Put, Delete, Body, Param,
  Query, Headers, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import {
  ApiTags, ApiOperation, ApiResponse, ApiBearerAuth,
  ApiHeader, ApiParam,
} from '@nestjs/swagger'
import { IotDeviceService } from '../services/iot-device.service'
import {
  DeviceRegisterDto,
  RelayCommandDto,
  OtaUpdateDto,
  SensorHistoryQueryDto,
} from '../dto/iot.dto'
import { AccessTokenGuard, RequirePermissions } from '../../auth/guards/auth.guard'
import { CurrentUser } from '../../auth/decorators/current-user.decorator'
import { MqttService } from '../../../core/mqtt/mqtt.service'

@ApiTags('IoT Devices')
@Controller('devices')
export class IotController {
  constructor(
    private readonly iotService: IotDeviceService,
    private readonly mqttService: MqttService,
  ) {}

  // ============================================================
  // ESP32 OTOMATİK KAYIT (API Key ile)
  // ============================================================

  @Post('register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'ESP32 otomatik kayıt / güncelleme' })
  @ApiHeader({ name: 'X-Device-Key', description: 'Cihaz API anahtarı', required: false })
  @ApiResponse({ status: 200, description: 'Kayıt başarılı' })
  async register(
    @Body() dto: DeviceRegisterDto,
    @Headers('x-device-key') apiKey?: string,
  ) {
    return this.iotService.registerDevice(dto, apiKey)
  }

  // ============================================================
  // TÜM CİHAZLAR
  // ============================================================

  @Get()
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tüm cihazları listele' })
  async getAllDevices() {
    return this.iotService.getAllDevices()
  }

  // ============================================================
  // CİHAZ DETAY
  // ============================================================

  @Get(':id')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cihaz detayı ve son sensör okumaları' })
  async getDevice(@Param('id') id: string) {
    const devices = await this.iotService.getAllDevices()
    const device = devices.find(d => d.id === id)
    if (!device) return { error: 'Cihaz bulunamadı' }
    return device
  }

  // ============================================================
  // ROLE KONTROLÜ
  // ============================================================

  @Post(':id/relay')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Röle açma/kapama komutu gönder' })
  @ApiParam({ name: 'id', description: 'Cihaz ID' })
  async controlRelay(
    @Param('id') id: string,
    @Body() dto: RelayCommandDto,
    @CurrentUser() user: any,
  ) {
    await this.iotService.controlRelay(id, dto)
    return {
      success: true,
      message: `${dto.relayId} röle ${dto.state ? 'açıldı' : 'kapatıldı'}`,
      timestamp: new Date().toISOString(),
    }
  }

  // ============================================================
  // SENSÖR GEÇMİŞİ
  // ============================================================

  @Get(':id/readings')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Sensör okuma geçmişi' })
  async getSensorHistory(
    @Param('id') id: string,
    @Query() query: SensorHistoryQueryDto,
  ) {
    return this.iotService.getSensorHistory(id, query)
  }

  // ============================================================
  // ANLIQ VERİ
  // ============================================================

  @Get(':id/live')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Anlık sensör verileri (cache)' })
  async getLiveData(@Param('id') id: string) {
    const devices = await this.iotService.getAllDevices()
    const device = devices.find(d => d.id === id)
    if (!device) return { error: 'Cihaz bulunamadı' }
    return {
      deviceId: id,
      mac: device.mac,
      readings: device.latestReadings,
      isOnline: device.isOnline,
      lastSeen: device.lastSeen,
    }
  }

  // ============================================================
  // OTA GÜNCELLEME
  // ============================================================

  @Post(':id/ota')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'OTA firmware güncelleme başlat' })
  async sendOtaUpdate(
    @Param('id') id: string,
    @Body() dto: OtaUpdateDto,
  ) {
    await this.iotService.sendOtaUpdate(id, dto)
    return { success: true, message: `OTA güncelleme başlatıldı: ${dto.version}` }
  }

  // ============================================================
  // CİHAZ YENİDEN BAŞLATMA
  // ============================================================

  @Post(':id/reboot')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:manage')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cihazı yeniden başlat' })
  async rebootDevice(@Param('id') id: string) {
    const devices = await this.iotService.getAllDevices()
    const device = devices.find(d => d.id === id)
    if (!device) return { error: 'Cihaz bulunamadı' }

    this.mqttService.rebootDevice('default', device.mac)
    return { success: true, message: 'Yeniden başlatma komutu gönderildi' }
  }

  // ============================================================
  // MQTT BAĞLANTI DURUMU
  // ============================================================

  @Get('system/mqtt-status')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'MQTT bağlantı durumu' })
  async getMqttStatus() {
    return {
      connected: this.mqttService.getConnectionStatus(),
      timestamp: new Date().toISOString(),
    }
  }
}

// ============================================================
// SCADA CONTROLLER
// ============================================================

@ApiTags('SCADA')
@Controller('scada')
export class ScadaController {
  constructor(private readonly iotService: IotDeviceService) {}

  @Get('live')
  @UseGuards(AccessTokenGuard)
  @RequirePermissions('scada:read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Tüm cihazların anlık özeti' })
  async getLiveSummary() {
    const devices = await this.iotService.getAllDevices()
    const readings = this.iotService.getLatestReadings()

    // Sera ve ahır verisini düzenle
    const seraDevice = devices.find(d => d.name.toLowerCase().includes('sera'))
    const ahirDevice = devices.find(d => d.name.toLowerCase().includes('ahir'))

    const seraReadings = seraDevice ? (readings[seraDevice.mac] || {}) : {}
    const ahirReadings = ahirDevice ? (readings[ahirDevice.mac] || {}) : {}

    return {
      sera: {
        temp: seraReadings.temp || seraReadings.temperature || 0,
        hum: seraReadings.hum || seraReadings.humidity || 0,
        ph: seraReadings.ph || 0,
        ec: seraReadings.ec || 0,
        tank: seraReadings.tank || seraReadings.water_level || 0,
      },
      ahir: {
        temp: ahirReadings.temp || ahirReadings.temperature || 0,
        hum: ahirReadings.hum || ahirReadings.humidity || 0,
        amonyak: ahirReadings.ammonia || ahirReadings.amonyak || 0,
      },
      devices: devices.map(d => ({
        id: d.id, name: d.name, mac: d.mac,
        isOnline: d.isOnline, rssi: d.rssi,
        firmwareVer: d.firmwareVer, lastSeen: d.lastSeen,
      })),
      timestamp: new Date().toISOString(),
    }
  }
}
