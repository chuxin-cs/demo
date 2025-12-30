import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './bootstrap/app.setup';
import { setupSwagger } from './bootstrap/swagger.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 入口文件仅负责启动流程，具体设置抽取到独立模块
  setupApp(app);
  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
