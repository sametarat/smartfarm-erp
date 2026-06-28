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
exports.FarmController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let FarmController = class FarmController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getZones() {
        return this.prisma.farmZone.findMany({
            include: {
                crops: { where: { status: { in: ['PLANNED', 'GROWING'] } }, take: 5 },
                devices: { select: { id: true, name: true, isOnline: true } },
                _count: { select: { crops: true, animals: true } },
            },
            orderBy: { name: 'asc' },
        });
    }
    async createZone(body) {
        return this.prisma.farmZone.create({
            data: {
                name: body.name,
                type: body.type || 'GREENHOUSE',
                description: body.description,
                area: body.area ? parseFloat(body.area) : undefined,
                farmId: body.farmId,
            },
        });
    }
    async getCrops(status, zoneId) {
        const where = {};
        if (status)
            where.status = status;
        if (zoneId)
            where.zoneId = zoneId;
        return this.prisma.crop.findMany({
            where,
            include: {
                zone: { select: { id: true, name: true, type: true } },
                harvests: { orderBy: { harvestedAt: 'desc' }, take: 3 },
                _count: { select: { harvests: true, irrigations: true } },
            },
            orderBy: { plantDate: 'desc' },
        });
    }
    async getCropStats() {
        const [total, growing, harvested] = await Promise.all([
            this.prisma.crop.count(),
            this.prisma.crop.count({ where: { status: 'GROWING' } }),
            this.prisma.crop.count({ where: { status: 'HARVESTED' } }),
        ]);
        const totalHarvest = await this.prisma.harvest.aggregate({
            _sum: { quantity: true },
        });
        return { total, growing, harvested, totalHarvestKg: totalHarvest._sum.quantity || 0 };
    }
    async createCrop(body) {
        return this.prisma.crop.create({
            data: {
                name: body.name,
                variety: body.variety,
                plantDate: body.plantDate ? new Date(body.plantDate) : undefined,
                expectedHarvest: body.expectedHarvest ? new Date(body.expectedHarvest) : undefined,
                status: body.status || 'GROWING',
                area: body.area ? parseFloat(body.area) : undefined,
                notes: body.notes,
                zoneId: body.zoneId,
            },
            include: { zone: { select: { id: true, name: true } } },
        });
    }
    async updateCrop(id, body) {
        const data = {};
        if (body.status !== undefined)
            data.status = body.status;
        if (body.notes !== undefined)
            data.notes = body.notes;
        if (body.actualHarvest)
            data.actualHarvest = new Date(body.actualHarvest);
        return this.prisma.crop.update({ where: { id }, data });
    }
    async deleteCrop(id) {
        await this.prisma.crop.delete({ where: { id } });
        return { message: 'Ürün silindi' };
    }
    async addHarvest(cropId, body) {
        const harvest = await this.prisma.harvest.create({
            data: {
                cropId,
                quantity: parseFloat(body.quantity),
                unit: body.unit || 'kg',
                quality: body.quality,
                price: body.price ? parseFloat(body.price) : undefined,
                notes: body.notes,
                harvestedAt: body.harvestedAt ? new Date(body.harvestedAt) : new Date(),
            },
        });
        await this.prisma.crop.update({
            where: { id: cropId },
            data: { status: 'HARVESTED', actualHarvest: new Date() },
        });
        return harvest;
    }
    async addIrrigation(cropId, body) {
        return this.prisma.irrigation.create({
            data: {
                cropId,
                amount: parseFloat(body.amount),
                unit: body.unit || 'litre',
                duration: body.duration ? parseInt(body.duration) : undefined,
                ph: body.ph ? parseFloat(body.ph) : undefined,
                ec: body.ec ? parseFloat(body.ec) : undefined,
                notes: body.notes,
                irrigatedAt: body.irrigatedAt ? new Date(body.irrigatedAt) : new Date(),
            },
        });
    }
    async addFertilization(cropId, body) {
        return this.prisma.fertilization.create({
            data: {
                cropId,
                fertilizerName: body.fertilizerName,
                amount: parseFloat(body.amount),
                unit: body.unit || 'ml',
                notes: body.notes,
                fertilizedAt: body.fertilizedAt ? new Date(body.fertilizedAt) : new Date(),
            },
        });
    }
};
exports.FarmController = FarmController;
__decorate([
    (0, common_1.Get)('zones'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "getZones", null);
__decorate([
    (0, common_1.Post)('zones'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "createZone", null);
__decorate([
    (0, common_1.Get)('crops'),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('zoneId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "getCrops", null);
__decorate([
    (0, common_1.Get)('crops/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "getCropStats", null);
__decorate([
    (0, common_1.Post)('crops'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "createCrop", null);
__decorate([
    (0, common_1.Put)('crops/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "updateCrop", null);
__decorate([
    (0, common_1.Delete)('crops/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "deleteCrop", null);
__decorate([
    (0, common_1.Post)('crops/:id/harvests'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "addHarvest", null);
__decorate([
    (0, common_1.Post)('crops/:id/irrigations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "addIrrigation", null);
__decorate([
    (0, common_1.Post)('crops/:id/fertilizations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FarmController.prototype, "addFertilization", null);
exports.FarmController = FarmController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('farm'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FarmController);
//# sourceMappingURL=farm.controller.js.map