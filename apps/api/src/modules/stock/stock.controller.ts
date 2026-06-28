import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll(@Query('categoryId') categoryId?: string, @Query('lowStock') lowStock?: string) {
    const stocks = await this.prisma.stock.findMany({
      where: categoryId ? { categoryId } : {},
      include: {
        category: true,
        movements: { orderBy: { createdAt: 'desc' }, take: 5 },
      },
      orderBy: { name: 'asc' },
    });
    if (lowStock === 'true') {
      return stocks.filter((s: any) => s.minQuantity && s.quantity <= s.minQuantity);
    }
    return stocks;
  }

  @Get('categories')
  async getCategories() {
    return this.prisma.stockCategory.findMany({
      include: { _count: { select: { stocks: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Get('alerts')
  async getAlerts() {
    const stocks = await this.prisma.stock.findMany({
      where: { minQuantity: { not: null } },
      include: { category: true },
    });
    return stocks.filter((s: any) => s.minQuantity && s.quantity <= s.minQuantity)
      .map((s: any) => ({
        id: s.id, name: s.name, current: s.quantity,
        minimum: s.minQuantity, unit: s.unit,
        category: s.category.name, critical: s.quantity === 0,
      }));
  }

  @Post('categories')
  async createCategory(@Body() body: any) {
    return this.prisma.stockCategory.create({
      data: { name: body.name, unit: body.unit || 'adet' },
    });
  }

  @Post()
  async create(@Body() body: any) {
    return this.prisma.stock.create({
      data: {
        name:        body.name,
        code:        body.code,
        categoryId:  body.categoryId,
        unit:        body.unit,
        quantity:    0,
        minQuantity: body.minQuantity ? parseFloat(body.minQuantity) : undefined,
        price:       body.price ? parseFloat(body.price) : undefined,
        location:    body.location,
      },
      include: { category: true },
    });
  }

  @Post(':id/movement')
  async addMovement(@Param('id') stockId: string, @Body() body: any) {
    const stock = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return { error: 'Stok bulunamadı' };

    let newQty = stock.quantity;
    if      (body.type === 'IN')         newQty += parseFloat(body.quantity);
    else if (body.type === 'OUT')        newQty -= parseFloat(body.quantity);
    else if (body.type === 'ADJUSTMENT') newQty  = parseFloat(body.quantity);

    if (newQty < 0) return { error: 'Yetersiz stok' };

    const [movement] = await this.prisma.$transaction([
      this.prisma.stockMovement.create({
        data: {
          stockId,
          type:      body.type,
          quantity:  parseFloat(body.quantity),
          unitPrice: body.unitPrice ? parseFloat(body.unitPrice) : undefined,
          reason:    body.reason,
          notes:     body.notes,
        },
      }),
      this.prisma.stock.update({
        where: { id: stockId },
        data:  { quantity: newQty },
      }),
    ]);

    return movement;
  }
}