import { Module } from '@nestjs/common';
import { AnimalController } from './animal.controller';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [AnimalController],
  providers: [PrismaService],
})
export class AnimalModule {}