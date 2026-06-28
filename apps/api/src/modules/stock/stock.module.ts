import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [StockController],
  providers: [PrismaService],
})
export class StockModule {}