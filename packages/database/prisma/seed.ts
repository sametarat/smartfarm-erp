// SmartFarm ERP — Seed v2 (Prisma 7 uyumlu)
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as bcrypt from 'bcryptjs'

const connectionString = process.env.DATABASE_URL || 'postgresql://smartfarm:smartfarm123@localhost:5432/smartfarm'

async function main() {
  const { Pool } = await import('pg')
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter } as any)

  console.log('Seed baslatiliyor...')

  const ROLES = [
    { name: 'SUPER_ADMIN', displayName: 'Super Admin',      isSystem: true },
    { name: 'ADMIN',       displayName: 'Yonetici',         isSystem: true },
    { name: 'OWNER',       displayName: 'Isletme Sahibi',   isSystem: false },
    { name: 'VET',         displayName: 'Veteriner',        isSystem: false },
    { name: 'AGRONOMIST',  displayName: 'Ziraat Muhendisi', isSystem: false },
    { name: 'TECHNICIAN',  displayName: 'Teknisyen',        isSystem: false },
    { name: 'GREENHOUSE',  displayName: 'Sera Personeli',   isSystem: false },
    { name: 'BARN',        displayName: 'Ahir Personeli',   isSystem: false },
    { name: 'WAREHOUSE',   displayName: 'Depo Personeli',   isSystem: false },
    { name: 'ACCOUNTANT',  displayName: 'Muhasebe',         isSystem: false },
    { name: 'GUEST',       displayName: 'Misafir',          isSystem: true },
  ]

  const PERMS: Record<string, { module: string; action: string }[]> = {
    SUPER_ADMIN: ['farm','animal','task','scada','crm','finance','stock','user','report','maintenance'].map(m => ({ module: m, action: 'manage' })),
    ADMIN:       ['farm','animal','task','scada','crm','finance','stock','user','report','maintenance'].map(m => ({ module: m, action: 'manage' })),
    OWNER: [
      ...['farm','animal','task','crm','finance','stock','report','maintenance'].map(m => ({ module: m, action: 'manage' })),
      { module: 'scada', action: 'read' }, { module: 'user', action: 'read' },
    ],
    VET:        [{ module:'animal',action:'manage'},{module:'task',action:'read'},{module:'task',action:'update'},{module:'stock',action:'read'}],
    AGRONOMIST: [{ module:'farm',action:'manage'},{module:'task',action:'manage'},{module:'scada',action:'read'},{module:'stock',action:'read'}],
    TECHNICIAN: [{ module:'scada',action:'manage'},{module:'maintenance',action:'manage'},{module:'task',action:'read'},{module:'stock',action:'read'}],
    GREENHOUSE: [{ module:'farm',action:'read'},{module:'task',action:'read'},{module:'scada',action:'read'},{module:'stock',action:'read'}],
    BARN:       [{ module:'animal',action:'read'},{module:'task',action:'read'},{module:'scada',action:'read'}],
    WAREHOUSE:  [{ module:'stock',action:'manage'},{module:'task',action:'read'}],
    ACCOUNTANT: [{ module:'finance',action:'manage'},{module:'crm',action:'read'},{module:'report',action:'read'}],
    GUEST:      [{ module:'farm',action:'read'}],
  }

  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { name: role.name },
      create: { name: role.name, displayName: role.displayName, isSystem: role.isSystem },
      update: { displayName: role.displayName },
    })
    console.log(`Rol: ${created.name}`)

    for (const perm of PERMS[role.name] || []) {
      await prisma.permission.upsert({
        where: { module_action_resource_roleId: { module: perm.module, action: perm.action, resource: '*', roleId: created.id } },
        create: { module: perm.module, action: perm.action, resource: '*', roleId: created.id },
        update: {},
      })
    }
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } })
  const ownerRole = await prisma.role.findUnique({ where: { name: 'OWNER' } })

  if (adminRole) {
    await prisma.user.upsert({
      where: { email: 'admin@smartfarm.com' },
      create: { email: 'admin@smartfarm.com', name: 'Super', surname: 'Admin', passwordHash: await bcrypt.hash('Admin123!', 12), roleId: adminRole.id, status: 'ACTIVE' },
      update: {},
    })
    console.log('Admin: admin@smartfarm.com / Admin123!')
  }

  if (ownerRole) {
    await prisma.user.upsert({
      where: { email: 'samet@cayirkoy.com' },
      create: { email: 'samet@cayirkoy.com', name: 'Samet', surname: 'Aratoglu', passwordHash: await bcrypt.hash('Owner123!', 12), roleId: ownerRole.id, status: 'ACTIVE' },
      update: {},
    })
    console.log('Owner: samet@cayirkoy.com / Owner123!')
  }

  console.log('Seed tamamlandi!')
  await prisma.$disconnect()
  pool.end()
}

main().catch(e => { console.error(e); process.exit(1) })