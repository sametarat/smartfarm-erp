import { PrismaService } from '../../core/prisma/prisma.service';
export declare class StockController {
    private prisma;
    constructor(prisma: PrismaService);
    getAll(categoryId?: string, lowStock?: string): Promise<any>;
    getCategories(): Promise<any>;
    getAlerts(): Promise<any>;
    createCategory(body: any): Promise<any>;
    create(body: any): Promise<any>;
    addMovement(stockId: string, body: any): Promise<any>;
}
