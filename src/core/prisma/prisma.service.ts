import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://smartfarm:smartfarm123@localhost:5432/smartfarm',
    })
    const adapter = new PrismaPg(pool)
    super({ adapter } as any)
  }

  async onModuleInit() {
    await this.$connect()
    console.log('PostgreSQL baglandi')
  }

  async onModuleDestroy() {
    await this.$disconnect()
  }
}
