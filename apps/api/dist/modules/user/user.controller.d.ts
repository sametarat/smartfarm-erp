import { PrismaService } from '../../core/prisma/prisma.service';
export declare class UserController {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(): Promise<any>;
    getRoles(): Promise<any>;
    create(body: {
        email: string;
        name: string;
        surname: string;
        password: string;
        roleId: string;
        phone?: string;
    }): Promise<any>;
    update(id: string, body: any): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
