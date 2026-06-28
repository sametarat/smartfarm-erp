import { Module } from '@nestjs/common';
import { FinanceController } from './finance.controller';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [FinanceController],
  providers: [PrismaService],
})
export class FinanceModule {}