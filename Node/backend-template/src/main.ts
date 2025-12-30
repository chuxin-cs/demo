import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { knife4jSetup } from 'nestjs-knife4j-plus';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 全局开启参数校验与自动类型转换
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 过滤DTO未定义的字段
      forbidNonWhitelisted: true, // 抛出非法字段错误
      transform: true, // 自动类型转换（依赖 class-transformer）
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  // 全局序列化拦截器，支持 @Exclude 隐藏敏感字段
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  const config = new DocumentBuilder()
    .setTitle('swagger example')
    .setDescription('The swagger API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await knife4jSetup(app, [
    {
      name: '2.0 version', // 文档版本名称
      url: `/api2`, // Swagger openapi JSON地址
    },
  ]);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
