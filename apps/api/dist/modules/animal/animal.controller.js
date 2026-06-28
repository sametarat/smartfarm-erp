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
exports.AnimalController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let AnimalController = class AnimalController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll(status, species) {
        const where = { deletedAt: null };
        if (status)
            where.status = status;
        if (species)
            where.species = species;
        return this.prisma.animal.findMany({
            where,
            include: {
                zone: { select: { id: true, name: true } },
                vaccinations: { orderBy: { vaccinatedAt: 'desc' }, take: 1 },
                weightLogs: { orderBy: { measuredAt: 'desc' }, take: 1 },
                pregnancies: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { earTag: 'asc' },
        });
    }
    async getStats() {
        const [total, healthy, pregnant, sick] = await Promise.all([
            this.prisma.animal.count({ where: { deletedAt: null } }),
            this.prisma.animal.count({ where: { status: 'HEALTHY', deletedAt: null } }),
            this.prisma.animal.count({ where: { status: 'PREGNANT', deletedAt: null } }),
            this.prisma.animal.count({ where: { status: 'SICK', deletedAt: null } }),
        ]);
        return { total, healthy, pregnant, sick };
    }
    async getOne(id) {
        return this.prisma.animal.findFirst({
            where: { id, deletedAt: null },
            include: {
                zone: true,
                vaccinations: { orderBy: { vaccinatedAt: 'desc' } },
                weightLogs: { orderBy: { measuredAt: 'desc' } },
                pregnancies: { orderBy: { createdAt: 'desc' } },
                treatments: { orderBy: { treatedAt: 'desc' } },
                feedLogs: { orderBy: { fedAt: 'desc' }, take: 30 },
            },
        });
    }
    async create(body) {
        return this.prisma.animal.create({
            data: {
                earTag: body.earTag,
                rfid: body.rfid,
                name: body.name,
                species: body.species || 'Koyun',
                breed: body.breed || 'Ile de France',
                gender: body.gender || 'FEMALE',
                birthDate: body.birthDate ? new Date(body.birthDate) : undefined,
                weight: body.weight ? parseFloat(body.weight) : undefined,
                status: body.status || 'HEALTHY',
                notes: body.notes,
                zoneId: body.zoneId,
            },
        });
    }
    async update(id, body) {
        const data = {};
        if (body.name !== undefined)
            data.name = body.name;
        if (body.status !== undefined)
            data.status = body.status;
        if (body.weight !== undefined)
            data.weight = parseFloat(body.weight);
        if (body.notes !== undefined)
            data.notes = body.notes;
        if (body.zoneId !== undefined)
            data.zoneId = body.zoneId;
        return this.prisma.animal.update({ where: { id }, data });
    }
    async remove(id) {
        await this.prisma.animal.update({ where: { id }, data: { deletedAt: new Date() } });
        return { message: 'Hayvan silindi' };
    }
    async addVaccination(animalId, body) {
        return this.prisma.vaccination.create({
            data: {
                animalId,
                vaccineName: body.vaccineName,
                dose: body.dose ? parseFloat(body.dose) : undefined,
                unit: body.unit,
                nextDue: body.nextDue ? new Date(body.nextDue) : undefined,
                veterinary: body.veterinary,
                notes: body.notes,
                vaccinatedAt: body.vaccinatedAt ? new Date(body.vaccinatedAt) : new Date(),
            },
        });
    }
    async addWeight(animalId, body) {
        const log = await this.prisma.weightLog.create({
            data: {
                animalId,
                weight: parseFloat(body.weight),
                unit: body.unit || 'kg',
                notes: body.notes,
                measuredAt: body.measuredAt ? new Date(body.measuredAt) : new Date(),
            },
        });
        await this.prisma.animal.update({
            where: { id: animalId },
            data: { weight: parseFloat(body.weight) },
        });
        return log;
    }
    async addFeed(animalId, body) {
        return this.prisma.feedLog.create({
            data: {
                animalId,
                feedType: body.feedType,
                amount: parseFloat(body.amount),
                unit: body.unit || 'kg',
                notes: body.notes,
                fedAt: body.fedAt ? new Date(body.fedAt) : new Date(),
            },
        });
    }
    async addTreatment(animalId, body) {
        if (body.status) {
            await this.prisma.animal.update({
                where: { id: animalId },
                data: { status: body.status },
            });
        }
        return this.prisma.treatment.create({
            data: {
                animalId,
                diagnosis: body.diagnosis,
                medicine: body.medicine,
                dose: body.dose ? parseFloat(body.dose) : undefined,
                unit: body.unit,
                duration: body.duration ? parseInt(body.duration) : undefined,
                veterinary: body.veterinary,
                cost: body.cost ? parseFloat(body.cost) : undefined,
                notes: body.notes,
                treatedAt: body.treatedAt ? new Date(body.treatedAt) : new Date(),
            },
        });
    }
    async addBirth(animalId, body) {
        const pregnancy = await this.prisma.pregnancy.findFirst({
            where: { animalId, actualBirth: null },
            orderBy: { createdAt: 'desc' },
        });
        if (pregnancy) {
            await this.prisma.pregnancy.update({
                where: { id: pregnancy.id },
                data: {
                    actualBirth: new Date(body.birthDate || new Date()),
                    offspringCount: parseInt(body.offspringCount || '1'),
                    offspringAlive: parseInt(body.offspringAlive || body.offspringCount || '1'),
                    notes: body.notes,
                },
            });
        }
        await this.prisma.animal.update({
            where: { id: animalId },
            data: { status: 'HEALTHY' },
        });
        const offspring = [];
        const count = parseInt(body.offspringAlive || body.offspringCount || '1');
        for (let i = 0; i < count; i++) {
            const earTag = body.offspringEarTags?.[i] || `${body.earTagPrefix || 'YV'}-${Date.now()}-${i + 1}`;
            const animal = await this.prisma.animal.create({
                data: {
                    earTag,
                    species: body.species || 'Koyun',
                    breed: body.breed || 'Ile de France',
                    gender: body.offspringGenders?.[i] || 'FEMALE',
                    birthDate: new Date(body.birthDate || new Date()),
                    weight: body.offspringWeight ? parseFloat(body.offspringWeight) : undefined,
                    status: 'HEALTHY',
                    notes: `Anne küpe: ${animalId}`,
                    zoneId: body.zoneId,
                },
            });
            offspring.push(animal);
        }
        return { pregnancy, offspring };
    }
};
exports.AnimalController = AnimalController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('species')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "getOne", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/vaccinations'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "addVaccination", null);
__decorate([
    (0, common_1.Post)(':id/weights'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "addWeight", null);
__decorate([
    (0, common_1.Post)(':id/feeds'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "addFeed", null);
__decorate([
    (0, common_1.Post)(':id/treatments'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "addTreatment", null);
__decorate([
    (0, common_1.Post)(':id/births'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AnimalController.prototype, "addBirth", null);
exports.AnimalController = AnimalController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('animals'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AnimalController);
//# sourceMappingURL=animal.controller.js.map