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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("../../core/prisma/prisma.service");
const bcrypt = require("bcryptjs");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async login(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: { role: { include: { permissions: true } } },
        });
        if (!user)
            throw new common_1.UnauthorizedException('Email veya sifre hatali');
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid)
            throw new common_1.UnauthorizedException('Email veya sifre hatali');
        const token = this.jwtService.sign({ sub: user.id, email: user.email });
        return {
            accessToken: token,
            refreshToken: token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                surname: user.surname,
                twoFAEnabled: user.twoFAEnabled,
                role: {
                    id: user.role.id,
                    name: user.role.name,
                    displayName: user.role.displayName,
                    permissions: user.role.permissions.map(p => ({
                        module: p.module,
                        action: p.action,
                        resource: p.resource,
                    })),
                },
            },
        };
    }
    async getMe(userId) {
        return this.prisma.user.findUnique({
            where: { id: userId },
            include: { role: { include: { permissions: true } } },
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, jwt_1.JwtService])
], AuthService);
//# sourceMappingURL=auth.service.js.map