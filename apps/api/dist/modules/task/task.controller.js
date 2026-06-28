"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const common_2 = require("@nestjs/common");
const CurrentUser = (0, common_2.createParamDecorator)((data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
});
let TaskController = class TaskController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll(status, assigneeId) {
        const where = { deletedAt: null };
        if (status)
            where.status = status;
        if (assigneeId)
            where.assigneeId = assigneeId;
        return this.prisma.task.findMany({
            where,
            include: {
                assignee: { select: { id: true, name: true, surname: true } },
                createdBy: { select: { id: true, name: true, surname: true } },
                checklist: true,
            },
            orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
        });
    }
    async getToday() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return this.prisma.task.findMany({
            where: { dueDate: { gte: today, lt: tomorrow }, status: { in: ['PENDING', 'IN_PROGRESS'] }, deletedAt: null },
            include: { assignee: { select: { id: true, name: true, surname: true } } },
            orderBy: { priority: 'desc' },
        });
    }
    async getStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [total, pending, completed] = await Promise.all([
            this.prisma.task.count({ where: { deletedAt: null } }),
            this.prisma.task.count({ where: { status: 'PENDING', deletedAt: null } }),
            this.prisma.task.count({ where: { status: 'COMPLETED', completedAt: { gte: today } } }),
        ]);
        return { total, pending, completed };
    }
    async getUsers() {
        return this.prisma.user.findMany({
            where: { status: 'ACTIVE', deletedAt: null },
            select: { id: true, name: true, surname: true, email: true },
            orderBy: { name: 'asc' },
        });
    }
    async getOne(id) {
        return this.prisma.task.findFirst({
            where: { id, deletedAt: null },
            include: { assignee: { select: { id: true, name: true, surname: true } }, checklist: true },
        });
    }
    async create(body, userId) {
        return this.prisma.task.create({
            data: {
                title: body.title,
                description: body.description,
                type: body.type || 'GENERAL',
                priority: body.priority || 'MEDIUM',
                assigneeId: body.assigneeId || undefined,
                dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
                createdById: userId,
                tags: body.tags || [],
                photos: [],
                recurrenceDays: [],
            },
        });
    }
    async complete(id, body) {
        return this.prisma.task.update({
            where: { id },
            data: { status: 'COMPLETED', completedAt: new Date(), completionNote: body.note },
        });
    }
    async remove(id) {
        await this.prisma.task.update({ where: { id }, data: { deletedAt: new Date() } });
        return { message: 'Silindi' };
    }
};
exports.TaskController = TaskController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('assigneeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('today'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "getToday", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('users-list'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "getUsers", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "complete", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TaskController.prototype, "remove", null);
exports.TaskController = TaskController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('tasks'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TaskController);
//# sourceMappingURL=task.controller.js.map