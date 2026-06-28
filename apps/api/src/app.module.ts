import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { TaskModule } from './modules/task/task.module';
import { UserModule } from './modules/user/user.module';
import { AnimalModule } from './modules/animal/animal.module';
import { FarmModule } from './modules/farm/farm.module';
import { CrmModule } from './modules/crm/crm.module';
import { StockModule } from './modules/stock/stock.module';
import { FinanceModule } from './modules/finance/finance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule, TaskModule, UserModule,
    AnimalModule, FarmModule, CrmModule,
    StockModule, FinanceModule,
  ],
})
export class AppModule {}