import { Module } from '@nestjs/common';
import { FarmController } from './farm.controller';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [FarmController],
  providers: [PrismaService],
})
export class FarmModule {}