import { PrismaService } from '../../core/prisma/prisma.service';
export declare class TaskController {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(status?: string, assigneeId?: string): Promise<any>;
    getToday(): Promise<any>;
    getStats(): Promise<{
        total: any;
        pending: any;
        completed: any;
    }>;
    getUsers(): Promise<any>;
    getOne(id: string): Promise<any>;
    create(body: any, userId: string): Promise<any>;
    complete(id: string, body: any): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
