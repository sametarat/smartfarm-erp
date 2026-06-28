// ============================================================
// SmartFarm ERP — IoT Device Service
// Cihaz yönetimi, sensör işleme, alarm üretimi
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { OnEvent } from '@nestjs/event-emitter'
import { PrismaService } from '../../core/prisma/prisma.service'
import { MqttService, MqttMessage } from '../../core/mqtt/mqtt.service'
import { ScadaGateway } from '../scada/gateways/scada.gateway'
import { DeviceRegisterDto, RelayCommandDto, OtaUpdateDto, SensorHistoryQueryDto } from './dto/iot.dto'
import { Cron, CronExpression } from '@nestjs/schedule'

// Alarm eşikleri (veritabanından da gelebilir)
const DEFAULT_THRESHOLDS = {
  TEMPERATURE: { min: 10, max: 35, unit: '°C' },
  HUMIDITY:    { min: 30, max: 90, unit: '%' },
  PH:          { min: 5.5, max: 6.5, unit: '' },
  EC:          { min: 0.5, max: 2.0, unit: 'mS/cm' },
  AMMONIA:     { min: 0,  max: 25,  critical: 50, unit: 'ppm' },
  WATER_LEVEL: { min: 15, max: 100, unit: '%' },
}

@Injectable()
export class IotDeviceService {
  private readonly logger = new Logger(IotDeviceService.name)

  // RAM cache: son sensör okumaları (Redis'e geçilebilir)
  private readonly latestReadings = new Map<string, Record<string, number>>()
  private readonly deviceOnlineStatus = new Map<string, boolean>()

  constructor(
    private readonly prisma: PrismaService,
    private readonly mqtt: MqttService,
    private readonly scadaGateway: ScadaGateway,
  ) {}

  // ============================================================
  // ESP32 OTOMATİK KAYIT
  // ============================================================

  async registerDevice(dto: DeviceRegisterDto, apiKey?: string): Promise<any> {
    // MAC adresi normalize et
    const mac = dto.mac.toUpperCase().replace(/[^A-F0-9]/g, match =>
      match === ':' || match === '-' ? ':' : ''
    )

    // Mevcut cihaz var mı?
    let device = await this.prisma.device.findUnique({ where: { mac } })

    if (device) {
      // Güncelle (OTA sonrası firmware versiyonu değişmiş olabilir)
      device = await this.prisma.device.update({
        where: { mac },
        data: {
          name: dto.name,
          ipAddress: dto.ipAddress,
          firmwareVer: dto.firmwareVer,
          rssi: dto.rssi,
          isOnline: true,
          lastSeen: new Date(),
        },
        include: { sensors: true, relays: true },
      })
      this.logger.log(`Cihaz güncellendi: ${mac} (${dto.name})`)
    } else {
      // Yeni cihaz oluştur
      device = await this.prisma.device.create({
        data: {
          mac,
          name: dto.name,
          type: dto.type,
          ipAddress: dto.ipAddress,
          firmwareVer: dto.firmwareVer,
          rssi: dto.rssi,
          farmZoneId: dto.farmZoneId,
          isOnline: true,
          lastSeen: new Date(),
          sensors: dto.sensors ? {
            create: dto.sensors.map(s => ({
              name: s.name,
              type: s.type,
              unit: s.unit,
              minAlert: s.minAlert,
              maxAlert: s.maxAlert,
            }))
          } : undefined,
        },
        include: { sensors: true, relays: true },
      })
      this.logger.log(`Yeni cihaz kaydedildi: ${mac} (${dto.name})`)
    }

    this.deviceOnlineStatus.set(mac, true)

    // WebSocket ile frontend'e bildir
    this.scadaGateway.broadcastDeviceStatus({
      mac,
      name: device.name,
      isOnline: true,
      firmwareVer: device.firmwareVer,
      rssi: device.rssi,
    })

    return {
      deviceId: device.id,
      mac: device.mac,
      name: device.name,
      registered: true,
      serverTime: new Date().toISOString(),
    }
  }

  // ============================================================
  // MQTT: SENSOR VERISI GELDI
  // ============================================================

  @OnEvent('iot.sensor.reading')
  async handleSensorReading(msg: MqttMessage): Promise<void> {
    const { mac, payload } = msg
    const readings: Record<string, number> = payload.readings || payload

    try {
      // Cihazı bul
      const device = await this.prisma.device.findUnique({
        where: { mac: mac.toUpperCase() },
        include: { sensors: true },
      })

      if (!device) {
        this.logger.warn(`Bilinmeyen cihaz sensör verisi gonderdi: ${mac}`)
        return
      }

      // Son okumayı cache'e al
      this.latestReadings.set(mac, readings)

      // Veritabanına toplu kaydet
      const sensorMap = new Map(device.sensors.map(s => [s.type.toLowerCase(), s]))
      const readingRecords: any[] = []

      for (const [key, value] of Object.entries(readings)) {
        if (typeof value !== 'number' || isNaN(value)) continue

        const sensor = sensorMap.get(key.toLowerCase()) ||
          device.sensors.find(s => s.name.toLowerCase() === key.toLowerCase())

        if (sensor) {
          readingRecords.push({
            sensorId: sensor.id,
            deviceId: device.id,
            value,
          })

          // Alarm kontrolü
          await this.checkAlarms(device, sensor, value)
        }
      }

      // Batch insert
      if (readingRecords.length > 0) {
        await this.prisma.sensorReading.createMany({ data: readingRecords })
      }

      // Cihaz lastSeen güncelle
      await this.prisma.device.update({
        where: { id: device.id },
        data: { lastSeen: new Date(), isOnline: true, rssi: payload.rssi || device.rssi },
      })

      // WebSocket ile frontend'e canlı veri gönder
      this.scadaGateway.broadcastSensorReading({
        mac,
        deviceId: device.id,
        deviceName: device.name,
        readings,
        timestamp: new Date().toISOString(),
      })

    } catch (err) {
      this.logger.error(`Sensör verisi işleme hatası [${mac}]:`, err)
    }
  }

  // ============================================================
  // MQTT: CIHAZ DURUM GÜNCELLEMESI
  // ============================================================

  @OnEvent('iot.device.status')
  async handleDeviceStatus(msg: MqttMessage): Promise<void> {
    const { mac, payload } = msg
    const wasOnline = this.deviceOnlineStatus.get(mac)
    const isOnline = payload.online !== false

    this.deviceOnlineStatus.set(mac, isOnline)

    try {
      await this.prisma.device.updateMany({
        where: { mac: mac.toUpperCase() },
        data: {
          isOnline,
          lastSeen: new Date(),
          rssi: payload.rssi,
          firmwareVer: payload.firmwareVer || undefined,
        },
      })

      // Durum değişti mi?
      if (wasOnline !== isOnline) {
        this.logger.log(`Cihaz durumu değişti: ${mac} → ${isOnline ? 'ONLINE' : 'OFFLINE'}`)

        if (!isOnline) {
          this.scadaGateway.broadcastAlarm({
            severity: 'warning',
            message: `Cihaz çevrimdışı: ${mac}`,
            deviceMac: mac,
            timestamp: new Date().toISOString(),
          })
        }
      }

      this.scadaGateway.broadcastDeviceStatus({
        mac, isOnline, rssi: payload.rssi, firmwareVer: payload.firmwareVer,
      })

    } catch (err) {
      this.logger.error(`Cihaz durum güncelleme hatası [${mac}]:`, err)
    }
  }

  // ============================================================
  // MQTT: ALARM GELDİ
  // ============================================================

  @OnEvent('iot.device.alert')
  async handleDeviceAlert(msg: MqttMessage): Promise<void> {
    const { mac, payload } = msg
    this.logger.warn(`Cihaz alarmı [${mac}]: ${JSON.stringify(payload)}`)

    this.scadaGateway.broadcastAlarm({
      severity: payload.severity || 'warning',
      message: payload.message || `Cihaz alarmı: ${mac}`,
      deviceMac: mac,
      data: payload,
      timestamp: new Date().toISOString(),
    })
  }

  // ============================================================
  // ALARM KONTROLÜ
  // ============================================================

  private async checkAlarms(device: any, sensor: any, value: number): Promise<void> {
    const thresholdKey = sensor.type.toUpperCase() as keyof typeof DEFAULT_THRESHOLDS
    const threshold = DEFAULT_THRESHOLDS[thresholdKey]

    if (!threshold) return

    const minAlert = sensor.minAlert ?? threshold.min
    const maxAlert = sensor.maxAlert ?? threshold.max
    const criticalAlert = (threshold as any).critical

    let severity: 'warning' | 'critical' | null = null
    let message = ''

    if (criticalAlert && value >= criticalAlert) {
      severity = 'critical'
      message = `KRİTİK: ${sensor.name} = ${value}${threshold.unit} (limit: ${criticalAlert})`
    } else if (value < minAlert) {
      severity = 'warning'
      message = `UYARI: ${sensor.name} düşük = ${value}${threshold.unit} (min: ${minAlert})`
    } else if (value > maxAlert) {
      severity = 'warning'
      message = `UYARI: ${sensor.name} yüksek = ${value}${threshold.unit} (max: ${maxAlert})`
    }

    if (severity) {
      this.scadaGateway.broadcastAlarm({
        severity,
        message,
        deviceId: device.id,
        deviceName: device.name,
        sensorType: sensor.type,
        value,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // ============================================================
  // ROLE KONTROL
  // ============================================================

  async controlRelay(deviceId: string, dto: RelayCommandDto): Promise<void> {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
    })

    if (!device) throw new NotFoundException('Cihaz bulunamadı')
    if (!device.isOnline) {
      throw new Error('Cihaz çevrimdışı — röle komutu gönderilemez')
    }

    // Varsayılan farmId (gerçek uygulamada context'ten alınır)
    const farmId = device.farmZoneId || 'default'

    this.mqtt.sendRelayCommand(farmId, device.mac, dto.relayId, dto.state, dto.autoOffSeconds)

    this.logger.log(`Röle komutu: [${device.mac}] ${dto.relayId} → ${dto.state}`)
  }

  // ============================================================
  // OTA GÜNCELLEME
  // ============================================================

  async sendOtaUpdate(deviceId: string, dto: OtaUpdateDto): Promise<void> {
    const device = await this.prisma.device.findUnique({ where: { id: deviceId } })
    if (!device) throw new NotFoundException('Cihaz bulunamadı')

    const farmId = device.farmZoneId || 'default'
    this.mqtt.sendOtaUpdate(farmId, device.mac, dto.firmwareUrl, dto.version)

    await this.prisma.device.update({
      where: { id: deviceId },
      data: { firmwareVer: `${dto.version} (updating...)` },
    })
  }

  // ============================================================
  // SENSOR GEÇMİŞİ
  // ============================================================

  async getSensorHistory(deviceId: string, query: SensorHistoryQueryDto) {
    const device = await this.prisma.device.findUnique({
      where: { id: deviceId },
      include: { sensors: true },
    })

    if (!device) throw new NotFoundException('Cihaz bulunamadı')

    const where: any = { deviceId }

    if (query.sensorType) {
      const sensor = device.sensors.find(s => s.type === query.sensorType)
      if (sensor) where.sensorId = sensor.id
    }

    if (query.from || query.to) {
      where.timestamp = {}
      if (query.from) where.timestamp.gte = new Date(query.from)
      if (query.to) where.timestamp.lte = new Date(query.to)
    }

    const readings = await this.prisma.sensorReading.findMany({
      where,
      include: { sensor: { select: { type: true, unit: true, name: true } } },
      orderBy: { timestamp: 'desc' },
      take: query.limit || 100,
    })

    return readings.map(r => ({
      timestamp: r.timestamp,
      value: r.value,
      sensorType: r.sensor.type,
      unit: r.sensor.unit,
    }))
  }

  // ============================================================
  // TÜM CİHAZLAR
  // ============================================================

  async getAllDevices() {
    const devices = await this.prisma.device.findMany({
      include: {
        sensors: true,
        relays: true,
        farmZone: { select: { name: true, type: true } },
      },
      orderBy: { lastSeen: 'desc' },
    })

    return devices.map(d => ({
      ...d,
      isOnline: this.deviceOnlineStatus.get(d.mac) ?? d.isOnline,
      latestReadings: this.latestReadings.get(d.mac) || {},
    }))
  }

  // ============================================================
  // OFFLINE CİHAZ TESPİTİ (Her 2 dk)
  // ============================================================

  @Cron(CronExpression.EVERY_2_MINUTES)
  async checkOfflineDevices(): Promise<void> {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000)

    const staleDevices = await this.prisma.device.findMany({
      where: {
        isOnline: true,
        lastSeen: { lt: twoMinutesAgo },
      },
    })

    for (const device of staleDevices) {
      await this.prisma.device.update({
        where: { id: device.id },
        data: { isOnline: false },
      })

      this.deviceOnlineStatus.set(device.mac, false)
      this.logger.warn(`Cihaz zaman aşımı (offline): ${device.mac}`)

      this.scadaGateway.broadcastAlarm({
        severity: 'warning',
        message: `Cihaz bağlantısı kesildi: ${device.name}`,
        deviceId: device.id,
        timestamp: new Date().toISOString(),
      })
    }
  }

  // ============================================================
  // ANLIQ VERİ (Dashboard için)
  // ============================================================

  getLatestReadings(mac?: string): any {
    if (mac) return this.latestReadings.get(mac) || {}
    return Object.fromEntries(this.latestReadings)
  }
}
