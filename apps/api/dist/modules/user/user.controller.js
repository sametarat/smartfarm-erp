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
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const bcrypt = require("bcryptjs");
let UserController = class UserController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll() {
        return this.prisma.user.findMany({
            where: { deletedAt: null },
            select: {
                id: true, email: true, name: true, surname: true,
                status: true, avatar: true, telegramId: true,
                lastLoginAt: true, createdAt: true,
                role: { select: { id: true, name: true, displayName: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async getRoles() {
        return this.prisma.role.findMany({
            select: { id: true, name: true, displayName: true },
            orderBy: { displayName: 'asc' },
        });
    }
    async create(body) {
        const exists = await this.prisma.user.findUnique({ where: { email: body.email } });
        if (exists)
            throw new Error('Bu email zaten kayıtlı');
        const hash = await bcrypt.hash(body.password, 12);
        return this.prisma.user.create({
            data: {
                email: body.email,
                name: body.name,
                surname: body.surname,
                phone: body.phone,
                passwordHash: hash,
                roleId: body.roleId,
                status: 'ACTIVE',
            },
            select: {
                id: true, email: true, name: true, surname: true, status: true,
                role: { select: { id: true, name: true, displayName: true } },
            },
        });
    }
    async update(id, body) {
        const data = {};
        if (body.name)
            data.name = body.name;
        if (body.surname)
            data.surname = body.surname;
        if (body.roleId)
            data.roleId = body.roleId;
        if (body.status)
            data.status = body.status;
        if (body.telegramId !== undefined)
            data.telegramId = body.telegramId;
        if (body.password)
            data.passwordHash = await bcrypt.hash(body.password, 12);
        return this.prisma.user.update({
            where: { id },
            data,
            select: {
                id: true, email: true, name: true, surname: true, status: true,
                role: { select: { id: true, name: true, displayName: true } },
            },
        });
    }
    async remove(id) {
        await this.prisma.user.update({
            where: { id },
            data: { status: 'INACTIVE', deletedAt: new Date() },
        });
        return { message: 'Kullanıcı silindi' };
    }
};
exports.UserController = UserController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('roles'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getRoles", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "remove", null);
exports.UserController = UserController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UserController);
//# sourceMappingURL=user.controller.js.map