import { Module } from '@nestjs/common';

import { UserModule } from './modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { createTypeOrmOptions } from './config/typeorm.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用，避免重复导入
      // 生产环境建议使用环境变量或容器注入，不读取 .env 文件
      envFilePath:
        process.env.NODE_ENV === 'production' ? undefined : './src/config/.env',
      cache: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        createTypeOrmOptions(configService),
      inject: [ConfigService],
    }),
    UserModule,
  ],
  providers: [],
})
export class AppModule {}
