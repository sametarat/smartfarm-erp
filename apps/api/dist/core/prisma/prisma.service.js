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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let PrismaService = class PrismaService {
    constructor() {
        const { PrismaClient } = require('@prisma/client');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const pool = new pg_1.Pool({
            connectionString: process.env.DATABASE_URL || 'postgresql://smartfarm:smartfarm123@localhost:5432/smartfarm',
        });
        const adapter = new PrismaPg(pool);
        this.client = new PrismaClient({ adapter });
        const models = [
            'user', 'role', 'permission', 'task', 'checklistItem', 'contact', 'contactNote',
            'animal', 'vaccination', 'weightLog', 'feedLog', 'treatment', 'pregnancy',
            'stock', 'stockCategory', 'stockMovement', 'transaction',
            'farm', 'farmZone', 'crop', 'harvest', 'irrigation', 'fertilization', 'spraying',
            'device', 'sensor', 'sensorReading', 'relay', 'deviceAlert',
            'auditLog', 'notification', 'staffProfile', 'leave', 'attendance',
            'maintenanceRecord',
        ];
        models.forEach(m => { this[m] = this.client[m]; });
    }
    async onModuleInit() { await this.client.$connect(); }
    async onModuleDestroy() { await this.client.$disconnect(); }
    async $disconnect() { await this.client.$disconnect(); }
    async $connect() { await this.client.$connect(); }
    get $transaction() { return this.client.$transaction.bind(this.client); }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map