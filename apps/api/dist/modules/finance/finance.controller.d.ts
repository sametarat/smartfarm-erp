import { PrismaService } from '../../core/prisma/prisma.service';
export declare class FinanceController {
    private prisma;
    constructor(prisma: PrismaService);
    getCategories(): {
        income: string[];
        expense: string[];
    };
    getTransactions(type?: string, category?: string, from?: string, to?: string, page?: string, limit?: string): Promise<{
        data: any;
        meta: {
            total: any;
            page: number;
            limit: number;
        };
    }>;
    create(body: any, userId: string): Promise<any>;
    getMonthlySummary(year?: string, month?: string): Promise<{
        income: any;
        expense: any;
        profit: number;
        byCategory: Record<string, number>;
        count: any;
    }>;
    getYearly(year?: string): Promise<{
        year: number;
        months: any[];
        totalIncome: any;
        totalExpense: any;
        totalProfit: number;
    }>;
    getKpi(): Promise<{
        monthlyRevenue: number;
        monthlyExpense: number;
        monthlyProfit: number;
        revenueGrowth: number;
    }>;
}
