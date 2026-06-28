// ============================================================
// SmartFarm ERP — MQTT Service
// ESP32 ile iki yönlü haberleşme
// Topic: smartfarm/{farmId}/device/{mac}/{type}
// ============================================================

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { EventEmitter2 } from '@nestjs/event-emitter'
import * as mqtt from 'mqtt'
import { MqttClient } from 'mqtt'

// ============================================================
// TOPIC PATTERNS
// ============================================================

export const TOPICS = {
  // ESP32 → Broker
  SENSOR_DATA:    'smartfarm/+/device/+/sensors',
  DEVICE_STATUS:  'smartfarm/+/device/+/status',
  RELAY_STATE:    'smartfarm/+/device/+/relay/state',
  DEVICE_ALERT:   'smartfarm/+/device/+/alert',
  DEVICE_LOG:     'smartfarm/+/device/+/log',

  // Broker → ESP32
  RELAY_CMD:      (farmId: string, mac: string) => `smartfarm/${farmId}/device/${mac}/relay/cmd`,
  OTA_CMD:        (farmId: string, mac: string) => `smartfarm/${farmId}/device/${mac}/ota`,
  CONFIG_CMD:     (farmId: string, mac: string) => `smartfarm/${farmId}/device/${mac}/config`,
  REBOOT_CMD:     (farmId: string, mac: string) => `smartfarm/${farmId}/device/${mac}/reboot`,
}

export interface MqttMessage {
  topic: string
  payload: any
  farmId: string
  mac: string
  type: string
}

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MqttService.name)
  private client: MqttClient
  private isConnected = false
  private readonly offlineQueue: { topic: string; payload: string }[] = []

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ============================================================
  // INIT
  // ============================================================

  async onModuleInit(): Promise<void> {
    const mqttUrl = this.config.get<string>('MQTT_URL', 'mqtt://localhost:1883')
    const mqttUser = this.config.get<string>('MQTT_USER', '')
    const mqttPass = this.config.get<string>('MQTT_PASS', '')

    this.client = mqtt.connect(mqttUrl, {
      username: mqttUser || undefined,
      password: mqttPass || undefined,
      clientId: `smartfarm-api-${Date.now()}`,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 10000,
      keepalive: 60,
      will: {
        topic: 'smartfarm/api/status',
        payload: JSON.stringify({ online: false, timestamp: new Date().toISOString() }),
        qos: 1,
        retain: true,
      },
    })

    this.client.on('connect', () => {
      this.isConnected = true
      this.logger.log(`MQTT baglandi: ${mqttUrl}`)
      this.subscribeToTopics()
      this.flushOfflineQueue()
      this.publishApiStatus(true)
    })

    this.client.on('reconnect', () => {
      this.logger.warn('MQTT yeniden baglanıyor...')
    })

    this.client.on('disconnect', () => {
      this.isConnected = false
      this.logger.warn('MQTT baglantisi kesildi')
    })

    this.client.on('error', (err) => {
      this.logger.error('MQTT hata:', err.message)
    })

    this.client.on('message', (topic, payload) => {
      this.handleMessage(topic, payload)
    })
  }

  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      this.publishApiStatus(false)
      this.client.end()
      this.logger.log('MQTT baglantisi kapatildi')
    }
  }

  // ============================================================
  // SUBSCRIBE
  // ============================================================

  private subscribeToTopics(): void {
    const topics = [
      TOPICS.SENSOR_DATA,
      TOPICS.DEVICE_STATUS,
      TOPICS.RELAY_STATE,
      TOPICS.DEVICE_ALERT,
      TOPICS.DEVICE_LOG,
    ]

    this.client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) {
        this.logger.error('Subscribe hatasi:', err.message)
      } else {
        this.logger.log(`${topics.length} topic'e abone olundu`)
      }
    })
  }

  // ============================================================
  // MESSAGE HANDLER
  // ============================================================

  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const parts = topic.split('/')
      // smartfarm / {farmId} / device / {mac} / {type} [/ {subtype}]
      if (parts.length < 5) return

      const farmId = parts[1]
      const mac    = parts[3]
      const type   = parts[4]
      const sub    = parts[5] || ''

      let data: any
      try {
        data = JSON.parse(payload.toString())
      } catch {
        data = payload.toString()
      }

      const msg: MqttMessage = { topic, payload: data, farmId, mac, type }

      // EventEmitter ile ilgili servislere yönlendir
      switch (type) {
        case 'sensors':
          this.eventEmitter.emit('iot.sensor.reading', { ...msg, readings: data })
          break
        case 'status':
          this.eventEmitter.emit('iot.device.status', { ...msg, status: data })
          break
        case 'alert':
          this.eventEmitter.emit('iot.device.alert', { ...msg, alert: data })
          break
        case 'relay':
          if (sub === 'state') {
            this.eventEmitter.emit('iot.relay.state', { ...msg, state: data })
          }
          break
        case 'log':
          this.logger.debug(`[${mac}] ${JSON.stringify(data)}`)
          break
        default:
          this.logger.verbose(`Bilinmeyen topic type: ${type}`)
      }
    } catch (err) {
      this.logger.error('Message handler hatasi:', err)
    }
  }

  // ============================================================
  // PUBLISH
  // ============================================================

  publish(topic: string, payload: any, options?: mqtt.IClientPublishOptions): void {
    const message = typeof payload === 'string' ? payload : JSON.stringify(payload)

    if (!this.isConnected) {
      this.logger.warn(`MQTT offline — mesaj kuyruğa alındı: ${topic}`)
      this.offlineQueue.push({ topic, payload: message })
      return
    }

    this.client.publish(topic, message, { qos: 1, ...options }, (err) => {
      if (err) {
        this.logger.error(`Publish hatasi [${topic}]:`, err.message)
      }
    })
  }

  // ============================================================
  // RELAY CONTROL
  // ============================================================

  sendRelayCommand(farmId: string, mac: string, relayId: string, state: boolean, autoOffSeconds?: number): void {
    const topic = TOPICS.RELAY_CMD(farmId, mac)
    const payload = {
      relayId,
      state,
      autoOffSeconds,
      timestamp: new Date().toISOString(),
    }
    this.publish(topic, payload)
    this.logger.log(`Role komutu: [${mac}] ${relayId} → ${state ? 'ACIK' : 'KAPALI'}`)
  }

  // ============================================================
  // OTA UPDATE
  // ============================================================

  sendOtaUpdate(farmId: string, mac: string, firmwareUrl: string, version: string): void {
    const topic = TOPICS.OTA_CMD(farmId, mac)
    this.publish(topic, { firmwareUrl, version, timestamp: new Date().toISOString() })
    this.logger.log(`OTA guncelleme gonderildi: [${mac}] → ${version}`)
  }

  // ============================================================
  // REBOOT
  // ============================================================

  rebootDevice(farmId: string, mac: string): void {
    const topic = TOPICS.REBOOT_CMD(farmId, mac)
    this.publish(topic, { command: 'reboot', timestamp: new Date().toISOString() })
    this.logger.log(`Cihaz yeniden baslatma: [${mac}]`)
  }

  // ============================================================
  // HELPERS
  // ============================================================

  private flushOfflineQueue(): void {
    if (this.offlineQueue.length === 0) return
    this.logger.log(`${this.offlineQueue.length} kuyruk mesaji gonderiliyor...`)
    while (this.offlineQueue.length > 0) {
      const item = this.offlineQueue.shift()!
      this.publish(item.topic, item.payload)
    }
  }

  private publishApiStatus(online: boolean): void {
    this.publish('smartfarm/api/status', {
      online,
      timestamp: new Date().toISOString(),
    }, { retain: true })
  }

  getConnectionStatus(): boolean {
    return this.isConnected
  }
}
