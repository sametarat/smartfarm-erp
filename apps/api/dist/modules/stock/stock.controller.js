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
exports.StockController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
let StockController = class StockController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAll(categoryId, lowStock) {
        const stocks = await this.prisma.stock.findMany({
            where: categoryId ? { categoryId } : {},
            include: {
                category: true,
                movements: { orderBy: { createdAt: 'desc' }, take: 5 },
            },
            orderBy: { name: 'asc' },
        });
        if (lowStock === 'true') {
            return stocks.filter((s) => s.minQuantity && s.quantity <= s.minQuantity);
        }
        return stocks;
    }
    async getCategories() {
        return this.prisma.stockCategory.findMany({
            include: { _count: { select: { stocks: true } } },
            orderBy: { name: 'asc' },
        });
    }
    async getAlerts() {
        const stocks = await this.prisma.stock.findMany({
            where: { minQuantity: { not: null } },
            include: { category: true },
        });
        return stocks.filter((s) => s.minQuantity && s.quantity <= s.minQuantity)
            .map((s) => ({
            id: s.id, name: s.name, current: s.quantity,
            minimum: s.minQuantity, unit: s.unit,
            category: s.category.name, critical: s.quantity === 0,
        }));
    }
    async createCategory(body) {
        return this.prisma.stockCategory.create({
            data: { name: body.name, unit: body.unit || 'adet' },
        });
    }
    async create(body) {
        return this.prisma.stock.create({
            data: {
                name: body.name,
                code: body.code,
                categoryId: body.categoryId,
                unit: body.unit,
                quantity: 0,
                minQuantity: body.minQuantity ? parseFloat(body.minQuantity) : undefined,
                price: body.price ? parseFloat(body.price) : undefined,
                location: body.location,
            },
            include: { category: true },
        });
    }
    async addMovement(stockId, body) {
        const stock = await this.prisma.stock.findUnique({ where: { id: stockId } });
        if (!stock)
            return { error: 'Stok bulunamadı' };
        let newQty = stock.quantity;
        if (body.type === 'IN')
            newQty += parseFloat(body.quantity);
        else if (body.type === 'OUT')
            newQty -= parseFloat(body.quantity);
        else if (body.type === 'ADJUSTMENT')
            newQty = parseFloat(body.quantity);
        if (newQty < 0)
            return { error: 'Yetersiz stok' };
        const [movement] = await this.prisma.$transaction([
            this.prisma.stockMovement.create({
                data: {
                    stockId,
                    type: body.type,
                    quantity: parseFloat(body.quantity),
                    unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : undefined,
                    reason: body.reason,
                    notes: body.notes,
                },
            }),
            this.prisma.stock.update({
                where: { id: stockId },
                data: { quantity: newQty },
            }),
        ]);
        return movement;
    }
};
exports.StockController = StockController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('categoryId')),
    __param(1, (0, common_1.Query)('lowStock')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getAll", null);
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StockController.prototype, "getAlerts", null);
__decorate([
    (0, common_1.Post)('categories'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "create", null);
__decorate([
    (0, common_1.Post)(':id/movement'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], StockController.prototype, "addMovement", null);
exports.StockController = StockController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('stock'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], StockController);
//# sourceMappingURL=stock.controller.js.map