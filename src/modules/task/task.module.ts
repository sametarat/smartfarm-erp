// ============================================================
// SmartFarm ERP — Task Module
// ============================================================

import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { TaskController } from './controllers/task.controller'
import { TaskService } from './services/task.service'
import { TelegramService } from '../telegram/services/telegram.service'
import { PrismaService } from '../../core/prisma/prisma.service'

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [TaskController],
  providers: [TaskService, TelegramService, PrismaService],
  exports: [TaskService],
})
export class TaskModule {}

// ============================================================
// PRISMA SCHEMA EKI — Task modeli
// packages/database/prisma/schema.prisma dosyasına ekle
// ============================================================

/*
enum TaskStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
  ON_HOLD
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum TaskType {
  IRRIGATION
  FERTILIZATION
  HARVESTING
  MAINTENANCE
  VETERINARY
  FEEDING
  INSPECTION
  CLEANING
  PLANTING
  SPRAYING
  GENERAL
}

enum RecurrenceType {
  NONE
  DAILY
  WEEKLY
  MONTHLY
  CUSTOM
}

model Task {
  id               String         @id @default(cuid())
  title            String
  description      String?
  type             TaskType       @default(GENERAL)
  priority         TaskPriority   @default(MEDIUM)
  status           TaskStatus     @default(PENDING)
  dueDate          DateTime?
  estimatedMinutes Int?
  actualMinutes    Int?
  completedAt      DateTime?
  completionNote   String?
  gpsLat           Float?
  gpsLng           Float?
  photos           String[]
  tags             String[]
  telegramMsgId    String?
  recurrence       RecurrenceType @default(NONE)
  recurrenceDays   Int[]

  // Relations
  assigneeId    String?
  assignee      User?       @relation("TaskAssignee", fields: [assigneeId], references: [id])
  createdById   String
  createdBy     User        @relation("TaskCreator", fields: [createdById], references: [id])
  farmZoneId    String?
  farmZone      FarmZone?   @relation(fields: [farmZoneId], references: [id])
  animalId      String?
  animal        Animal?     @relation(fields: [animalId], references: [id])
  checklist     ChecklistItem[]
  attachments   Attachment[]

  deletedAt     DateTime?
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  @@index([status, dueDate])
  @@index([assigneeId, status])
  @@index([priority, status])
  @@map("tasks")
}

model ChecklistItem {
  id          String    @id @default(cuid())
  title       String
  completed   Boolean   @default(false)
  completedAt DateTime?
  order       Int       @default(0)
  taskId      String
  task        Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@map("checklist_items")
}

model Attachment {
  id        String   @id @default(cuid())
  url       String
  name      String
  size      Int?
  mimeType  String?
  taskId    String?
  task      Task?    @relation(fields: [taskId], references: [id])
  createdAt DateTime @default(now())

  @@map("attachments")
}
*/

// ============================================================
// .env dosyasına eklenecek
// ============================================================

/*
TELEGRAM_BOT_TOKEN=8758391202:AAGYmaev9OHcN4vvahtS7OK68CTXU_Yhxtw
*/
