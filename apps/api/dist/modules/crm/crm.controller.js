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
exports.CrmController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let CrmController = class CrmController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll(type, search) {
        const where = { deletedAt: null, isActive: true };
        if (type)
            where.type = type;
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { company: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
            ];
        }
        return this.prisma.contact.findMany({
            where,
            include: {
                notes_rel: { orderBy: { createdAt: 'desc' }, take: 3 },
                transactions: { orderBy: { date: 'desc' }, take: 3,
                    select: { id: true, type: true, amount: true, date: true, description: true }
                },
            },
            orderBy: { name: 'asc' },
        });
    }
    async create(body) {
        return this.prisma.contact.create({
            data: {
                type: body.type || 'OTHER',
                name: body.name,
                company: body.company,
                email: body.email,
                phone: body.phone,
                address: body.address,
                taxNo: body.taxNo,
                notes: body.notes,
                tags: body.tags || [],
            },
        });
    }
    async update(id, body) {
        const data = {};
        if (body.name !== undefined)
            data.name = body.name;
        if (body.company !== undefined)
            data.company = body.company;
        if (body.email !== undefined)
            data.email = body.email;
        if (body.phone !== undefined)
            data.phone = body.phone;
        if (body.address !== undefined)
            data.address = body.address;
        if (body.notes !== undefined)
            data.notes = body.notes;
        if (body.isActive !== undefined)
            data.isActive = body.isActive;
        return this.prisma.contact.update({ where: { id }, data });
    }
    async remove(id) {
        await this.prisma.contact.update({
            where: { id },
            data: { deletedAt: new Date(), isActive: false },
        });
        return { message: 'Kişi silindi' };
    }
    async addNote(contactId, body) {
        return this.prisma.contactNote.create({
            data: { content: body.content, contactId },
        });
    }
};
exports.CrmController = CrmController;
__decorate([
    (0, common_1.Get)('contacts'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('search')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "getAll", null);
__decorate([
    (0, common_1.Post)('contacts'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "create", null);
__decorate([
    (0, common_1.Put)('contacts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)('contacts/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('contacts/:id/notes'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CrmController.prototype, "addNote", null);
exports.CrmController = CrmController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('crm'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CrmController);
//# sourceMappingURL=crm.controller.js.map