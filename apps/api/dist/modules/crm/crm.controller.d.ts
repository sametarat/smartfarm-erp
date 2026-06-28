import { PrismaService } from '../../core/prisma/prisma.service';
export declare class CrmController {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(type?: string, search?: string): Promise<any>;
    create(body: any): Promise<any>;
    update(id: string, body: any): Promise<any>;
    remove(id: string): Promise<{
        message: string;
    }>;
    addNote(contactId: string, body: any): Promise<any>;
}
