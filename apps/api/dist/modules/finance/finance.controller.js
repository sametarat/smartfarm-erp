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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("../auth/guards/jwt.guard");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const common_2 = require("@nestjs/common");
const CurrentUser = (0, common_2.createParamDecorator)((data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
});
const INCOME_CATEGORIES = [
    'Çilek Satışı', 'Marul Satışı', 'Fesleğen Satışı', 'Mantar Satışı',
    'Koyun Eti Satışı', 'Süt Satışı', 'Yavru Satışı', 'TKDK Hibesi',
    'Devlet Desteği', 'Diğer Gelir',
];
const EXPENSE_CATEGORIES = [
    'Tohum / Fide', 'Gübre (A+B)', 'Yem', 'Veteriner / İlaç',
    'Elektrik', 'Su', 'Yakıt', 'İşçilik', 'Kira (Arazi)',
    'Bakım / Onarım', 'Ekipman', 'Nakliye', 'Sigorta',
    'Kredi Taksiti', 'Diğer Gider',
];
let FinanceController = class FinanceController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    getCategories() {
        return { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES };
    }
    async getTransactions(type, category, from, to, page = '1', limit = '30') {
        const where = {};
        if (type)
            where.type = type;
        if (category)
            where.category = category;
        if (from || to) {
            where.date = {};
            if (from)
                where.date.gte = new Date(from);
            if (to)
                where.date.lte = new Date(to);
        }
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [data, total] = await Promise.all([
            this.prisma.transaction.findMany({
                where,
                orderBy: { date: 'desc' },
                skip,
                take: parseInt(limit),
            }),
            this.prisma.transaction.count({ where }),
        ]);
        return { data, meta: { total, page: parseInt(page), limit: parseInt(limit) } };
    }
    async create(body, userId) {
        return this.prisma.transaction.create({
            data: {
                type: body.type,
                category: body.category,
                amount: parseFloat(body.amount),
                description: body.description,
                date: new Date(body.date || new Date()),
                invoiceNo: body.invoiceNo,
                createdById: userId,
            },
        });
    }
    async getMonthlySummary(year, month) {
        const now = new Date();
        const y = parseInt(year || String(now.getFullYear()));
        const m = parseInt(month || String(now.getMonth() + 1));
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0, 23, 59, 59);
        const transactions = await this.prisma.transaction.findMany({
            where: { date: { gte: start, lte: end } },
        });
        const income = transactions
            .filter((t) => t.type === 'INCOME')
            .reduce((s, t) => s + Number(t.amount), 0);
        const expense = transactions
            .filter((t) => t.type === 'EXPENSE')
            .reduce((s, t) => s + Number(t.amount), 0);
        const byCategory = {};
        for (const t of transactions) {
            byCategory[t.category] = (byCategory[t.category] || 0) + Number(t.amount);
        }
        return {
            income,
            expense,
            profit: income - expense,
            byCategory,
            count: transactions.length,
        };
    }
    async getYearly(year) {
        const y = parseInt(year || String(new Date().getFullYear()));
        const months = [];
        for (let m = 1; m <= 12; m++) {
            const start = new Date(y, m - 1, 1);
            const end = new Date(y, m, 0, 23, 59, 59);
            const txs = await this.prisma.transaction.findMany({
                where: { date: { gte: start, lte: end } },
            });
            const income = txs.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0);
            const expense = txs.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
            months.push({ month: m, income, expense, profit: income - expense });
        }
        const totalIncome = months.reduce((s, m) => s + m.income, 0);
        const totalExpense = months.reduce((s, m) => s + m.expense, 0);
        return {
            year: y,
            months,
            totalIncome,
            totalExpense,
            totalProfit: totalIncome - totalExpense,
        };
    }
    async getKpi() {
        const now = new Date();
        const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
        const [thisInc, thisExp, lastInc] = await Promise.all([
            this.prisma.transaction.aggregate({
                where: { type: 'INCOME', date: { gte: thisStart } },
                _sum: { amount: true },
            }),
            this.prisma.transaction.aggregate({
                where: { type: 'EXPENSE', date: { gte: thisStart } },
                _sum: { amount: true },
            }),
            this.prisma.transaction.aggregate({
                where: { type: 'INCOME', date: { gte: lastStart, lte: lastEnd } },
                _sum: { amount: true },
            }),
        ]);
        const income = Number(thisInc._sum.amount || 0);
        const expense = Number(thisExp._sum.amount || 0);
        const prev = Number(lastInc._sum.amount || 0);
        return {
            monthlyRevenue: income,
            monthlyExpense: expense,
            monthlyProfit: income - expense,
            revenueGrowth: prev > 0 ? Math.round(((income - prev) / prev) * 100) : 0,
        };
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], FinanceController.prototype, "getCategories", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, common_1.Query)('type')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __param(4, (0, common_1.Query)('page')),
    __param(5, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Post)('transactions'),
    __param(0, (0, common_1.Body)()),
    __param(1, CurrentUser('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('summary'),
    __param(0, (0, common_1.Query)('year')),
    __param(1, (0, common_1.Query)('month')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getMonthlySummary", null);
__decorate([
    (0, common_1.Get)('yearly'),
    __param(0, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getYearly", null);
__decorate([
    (0, common_1.Get)('kpi'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getKpi", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.UseGuards)(jwt_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('finance'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map