import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client: any;

  user: any;
  role: any;
  permission: any;
  task: any;
  checklistItem: any;
  contact: any;
  contactNote: any;
  animal: any;
  vaccination: any;
  weightLog: any;
  feedLog: any;
  treatment: any;
  pregnancy: any;
  stock: any;
  stockCategory: any;
  stockMovement: any;
  transaction: any;
  farm: any;
  farmZone: any;
  crop: any;
  harvest: any;
  irrigation: any;
  fertilization: any;
  spraying: any;
  relay: any;
  deviceAlert: any;
  maintenanceRecord: any;
  device: any;
  sensor: any;
  sensorReading: any;
  auditLog: any;
  notification: any;
  staffProfile: any;
  leave: any;
  attendance: any;

  constructor() {
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const pool = new Pool({
      connectionString: 'postgresql://smartfarm:smartfarm123@localhost:5432/smartfarm',
    });
    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter });

    const models = [
  'user','role','permission','task','checklistItem','contact','contactNote',
  'animal','vaccination','weightLog','feedLog','treatment','pregnancy',
  'stock','stockCategory','stockMovement','transaction',
  'farm','farmZone','crop','harvest','irrigation','fertilization','spraying',
  'device','sensor','sensorReading','relay','deviceAlert',
  'auditLog','notification','staffProfile','leave','attendance',
  'maintenanceRecord',
];
    models.forEach(m => { (this as any)[m] = (this.client as any)[m]; });
  }

  async onModuleInit() { await this.client.$connect(); }
  async onModuleDestroy() { await this.client.$disconnect(); }
  async $disconnect() { await this.client.$disconnect(); }
  async $connect() { await this.client.$connect(); }
  get $transaction() { return this.client.$transaction.bind(this.client); }
}