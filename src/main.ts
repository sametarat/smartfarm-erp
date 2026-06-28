import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.enableCors({ origin: ['http://localhost:3000', 'http://localhost:3001'], credentials: true })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  const config = new DocumentBuilder()
    .setTitle('SmartFarm ERP API').setVersion('1.0').addBearerAuth().build()
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, config))
  await app.listen(3001)
  console.log('SmartFarm API: http://localhost:3001/api/v1')
  console.log('Swagger:       http://localhost:3001/api/docs')
}
bootstrap()
