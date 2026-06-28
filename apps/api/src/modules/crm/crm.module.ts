import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { PrismaService } from '../../core/prisma/prisma.service';

@Module({
  controllers: [CrmController],
  providers: [PrismaService],
})
export class CrmModule {}