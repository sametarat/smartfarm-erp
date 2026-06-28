import { JwtService } from "@nestjs/jwt";
import { PrismaService } from '../../core/prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    login(email: string, password: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: any;
            email: any;
            name: any;
            surname: any;
            twoFAEnabled: any;
            role: {
                id: any;
                name: any;
                displayName: any;
                permissions: any;
            };
        };
    }>;
    getMe(userId: string): Promise<any>;
}
