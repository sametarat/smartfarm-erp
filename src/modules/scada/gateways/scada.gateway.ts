// ============================================================
// SmartFarm ERP — SCADA WebSocket Gateway
// Socket.IO ile frontend'e canlı veri akışı
// ============================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  WsException,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'
import { Logger, UseGuards } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'

// ============================================================
// EVENTS
// ============================================================

export const SCADA_EVENTS = {
  // Server → Client
  SENSOR_READING:  'sensor:reading',
  DEVICE_STATUS:   'device:status',
  RELAY_CHANGED:   'relay:changed',
  ALARM_TRIGGERED: 'alarm:triggered',
  SCADA_UPDATE:    'scada:update',

  // Client → Server
  SUBSCRIBE:       'subscribe:scada',
  RELAY_CONTROL:   'relay:control',
  SUBSCRIBE_DEVICE:'subscribe:device',
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/',
  transports: ['websocket', 'polling'],
})
export class ScadaGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(ScadaGateway.name)
  private readonly connectedClients = new Map<string, { userId: string; farmId?: string }>()

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  // ============================================================
  // LIFECYCLE
  // ============================================================

  afterInit(server: Server): void {
    this.logger.log('SCADA WebSocket Gateway başlatıldı')
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      // Token doğrula
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '')

      if (!token) {
        client.disconnect()
        return
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      })

      this.connectedClients.set(client.id, { userId: payload.sub })
      this.logger.log(`Client bağlandı: ${client.id} (${payload.email})`)

      // Hoş geldin mesajı
      client.emit('connected', {
        clientId: client.id,
        serverTime: new Date().toISOString(),
        message: 'SCADA bağlantısı kuruldu',
      })

    } catch (err) {
      this.logger.warn(`Yetkisiz WebSocket bağlantısı: ${client.id}`)
      client.disconnect()
    }
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients.delete(client.id)
    this.logger.log(`Client ayrıldı: ${client.id}`)
  }

  // ============================================================
  // CLIENT EVENTS
  // ============================================================

  @SubscribeMessage('subscribe:scada')
  handleSubscribeScada(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { farmId?: string },
  ): void {
    const farmId = data?.farmId || 'default'
    client.join(`scada:${farmId}`)
    this.logger.log(`Client SCADA odasına katıldı: ${client.id} → scada:${farmId}`)

    const clientData = this.connectedClients.get(client.id)
    if (clientData) {
      this.connectedClients.set(client.id, { ...clientData, farmId })
    }

    client.emit('subscribed', { room: `scada:${farmId}`, timestamp: new Date().toISOString() })
  }

  @SubscribeMessage('subscribe:device')
  handleSubscribeDevice(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string },
  ): void {
    if (data?.deviceId) {
      client.join(`device:${data.deviceId}`)
    }
  }

  @SubscribeMessage('relay:control')
  async handleRelayControl(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string; relayId: string; state: boolean },
  ): Promise<void> {
    // TODO: IotDeviceService.controlRelay çağrısı
    this.logger.log(`WebSocket röle komutu: ${JSON.stringify(data)}`)
    client.emit('relay:ack', { ...data, timestamp: new Date().toISOString() })
  }

  // ============================================================
  // BROADCAST METHODS (Diğer servisler bunları çağırır)
  // ============================================================

  broadcastSensorReading(data: {
    mac: string
    deviceId: string
    deviceName: string
    readings: Record<string, number>
    timestamp: string
  }): void {
    this.server.to('scada:default').emit(SCADA_EVENTS.SENSOR_READING, data)
  }

  broadcastDeviceStatus(data: {
    mac: string
    name?: string
    isOnline: boolean
    rssi?: number
    firmwareVer?: string
  }): void {
    this.server.to('scada:default').emit(SCADA_EVENTS.DEVICE_STATUS, data)
  }

  broadcastRelayState(data: {
    mac: string
    relayId: string
    state: boolean
    timestamp: string
  }): void {
    this.server.to('scada:default').emit(SCADA_EVENTS.RELAY_CHANGED, data)
  }

  broadcastAlarm(data: {
    severity: 'info' | 'warning' | 'critical'
    message: string
    deviceId?: string
    deviceMac?: string
    deviceName?: string
    sensorType?: string
    value?: number
    data?: any
    timestamp: string
  }): void {
    // Kritik alarmlar tüm bağlı clientlara
    if (data.severity === 'critical') {
      this.server.emit(SCADA_EVENTS.ALARM_TRIGGERED, data)
    } else {
      this.server.to('scada:default').emit(SCADA_EVENTS.ALARM_TRIGGERED, data)
    }
  }

  // ============================================================
  // STATS
  // ============================================================

  getConnectedClientCount(): number {
    return this.connectedClients.size
  }
}
