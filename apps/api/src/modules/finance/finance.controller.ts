import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator((data: string | undefined, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return data ? req.user?.[data] : req.user;
});

const INCOME_CATEGORIES = [
  'Çilek Satışı','Marul Satışı','Fesleğen Satışı','Mantar Satışı',
  'Koyun Eti Satışı','Süt Satışı','Yavru Satışı','TKDK Hibesi',
  'Devlet Desteği','Diğer Gelir',
];

const EXPENSE_CATEGORIES = [
  'Tohum / Fide','Gübre (A+B)','Yem','Veteriner / İlaç',
  'Elektrik','Su','Yakıt','İşçilik','Kira (Arazi)',
  'Bakım / Onarım','Ekipman','Nakliye','Sigorta',
  'Kredi Taksiti','Diğer Gider',
];

@UseGuards(JwtAuthGuard)
@Controller('finance')
export class FinanceController {
  constructor(private prisma: PrismaService) {}

  @Get('categories')
  getCategories() {
    return { income: INCOME_CATEGORIES, expense: EXPENSE_CATEGORIES };
  }

  @Get('transactions')
  async getTransactions(
    @Query('type') type?: string,
    @Query('category') category?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    const where: any = {};
    if (type)     where.type     = type;
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to)   where.date.lte = new Date(to);
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

  @Post('transactions')
  async create(@Body() body: any, @CurrentUser('id') userId: string) {
    return this.prisma.transaction.create({
      data: {
        type:        body.type,
        category:    body.category,
        amount:      parseFloat(body.amount),
        description: body.description,
        date:        new Date(body.date || new Date()),
        invoiceNo:   body.invoiceNo,
        createdById: userId,
      },
    });
  }

  @Get('summary')
  async getMonthlySummary(
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const now = new Date();
    const y = parseInt(year || String(now.getFullYear()));
    const m = parseInt(month || String(now.getMonth() + 1));
    const start = new Date(y, m - 1, 1);
    const end   = new Date(y, m, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const income  = transactions
      .filter((t: any) => t.type === 'INCOME')
      .reduce((s: number, t: any) => s + Number(t.amount), 0);
    const expense = transactions
      .filter((t: any) => t.type === 'EXPENSE')
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

    const byCategory: Record<string, number> = {};
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

  @Get('yearly')
  async getYearly(@Query('year') year?: string) {
    const y = parseInt(year || String(new Date().getFullYear()));
    const months = [];

    for (let m = 1; m <= 12; m++) {
      const start = new Date(y, m - 1, 1);
      const end   = new Date(y, m, 0, 23, 59, 59);
      const txs   = await this.prisma.transaction.findMany({
        where: { date: { gte: start, lte: end } },
      });
      const income  = txs.filter((t: any) => t.type === 'INCOME').reduce((s: number, t: any) => s + Number(t.amount), 0);
      const expense = txs.filter((t: any) => t.type === 'EXPENSE').reduce((s: number, t: any) => s + Number(t.amount), 0);
      months.push({ month: m, income, expense, profit: income - expense });
    }

    const totalIncome  = months.reduce((s, m) => s + m.income, 0);
    const totalExpense = months.reduce((s, m) => s + m.expense, 0);

    return {
      year: y,
      months,
      totalIncome,
      totalExpense,
      totalProfit: totalIncome - totalExpense,
    };
  }

  @Get('kpi')
  async getKpi() {
    const now       = new Date();
    const thisStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastEnd   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [thisInc, thisExp, lastInc] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: { type: 'INCOME',  date: { gte: thisStart } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'EXPENSE', date: { gte: thisStart } },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { type: 'INCOME',  date: { gte: lastStart, lte: lastEnd } },
        _sum: { amount: true },
      }),
    ]);

    const income  = Number(thisInc._sum.amount || 0);
    const expense = Number(thisExp._sum.amount || 0);
    const prev    = Number(lastInc._sum.amount || 0);

    return {
      monthlyRevenue: income,
      monthlyExpense: expense,
      monthlyProfit:  income - expense,
      revenueGrowth:  prev > 0 ? Math.round(((income - prev) / prev) * 100) : 0,
    };
  }
}