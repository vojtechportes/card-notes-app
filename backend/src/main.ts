import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';
import { appConfig } from './config/app.config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors();
  app.setGlobalPrefix(appConfig.globalApiPrefix);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Card Notes App API')
    .setDescription('Local backend API for the Card Notes App.')
    .setVersion('0.1.0')
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);

  SwaggerModule.setup(`${appConfig.globalApiPrefix}/docs`, app, swaggerDocument);

  await app.listen(appConfig.port);
}

void bootstrap();
