export enum TaskStatus { PENDING='PENDING', IN_PROGRESS='IN_PROGRESS', COMPLETED='COMPLETED', CANCELLED='CANCELLED' }
export enum TaskPriority { LOW='LOW', MEDIUM='MEDIUM', HIGH='HIGH', CRITICAL='CRITICAL' }
export enum TaskType { IRRIGATION='IRRIGATION', FERTILIZATION='FERTILIZATION', HARVESTING='HARVESTING', MAINTENANCE='MAINTENANCE', VETERINARY='VETERINARY', FEEDING='FEEDING', INSPECTION='INSPECTION', CLEANING='CLEANING', GENERAL='GENERAL' }
export enum RecurrenceType { NONE='NONE', DAILY='DAILY', WEEKLY='WEEKLY', MONTHLY='MONTHLY' }

export class CreateTaskDto {
  title: string
  description?: string
  type?: TaskType
  priority?: TaskPriority
  assigneeId?: string
  dueDate?: string
  estimatedMinutes?: number
  farmZoneId?: string
  animalId?: string
  checklist?: { title: string; completed?: boolean }[]
  tags?: string[]
  recurrence?: RecurrenceType
  recurrenceDays?: number[]
  notifyTelegram?: boolean
}

export class UpdateTaskDto {
  title?: string
  description?: string
  status?: TaskStatus
  priority?: TaskPriority
  assigneeId?: string
  dueDate?: string
}

export class CompleteTaskDto {
  note?: string
  gpsLat?: number
  gpsLng?: number
  photos?: string[]
  actualMinutes?: number
}

export class TaskFilterDto {
  status?: TaskStatus
  priority?: TaskPriority
  type?: TaskType
  assigneeId?: string
  dueDateFrom?: string
  dueDateTo?: string
  page?: number
  limit?: number
}
