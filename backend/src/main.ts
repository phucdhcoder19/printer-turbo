import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Validate mọi request body theo DTO (class-validator)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // bỏ field thừa không khai báo trong DTO
      transform: true,            // tự ép kiểu theo DTO
      forbidNonWhitelisted: false,
    }),
  );

  // Tiền tố chung cho toàn bộ API: /api/...
  app.setGlobalPrefix('api');

  // Cho phép React (cổng khác) gọi sang
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN', '*'),
    credentials: true,
  });

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 NestJS chạy tại http://localhost:${port}/api`);
}
bootstrap();
