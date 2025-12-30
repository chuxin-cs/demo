import { Module } from '@nestjs/common';

import { UserModule } from './modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用，避免重复导入
      envFilePath: './src/config/.env', // 你的环境变量文件路径（根据实际调整）
    }),
    TypeOrmModule.forRootAsync({
      imports: undefined,
      // @ts-ignore
      isGlobal: true, // 全局注册 DataSource，所有子模块可直接使用
      useFactory: (configService: ConfigService) => ({
        type: 'mysql', // 数据库类型（你的是 MySQL，对应之前的配置）
        host: configService.get('DB_HOST'), // 从环境变量获取
        port: configService.get<number>('DB_PORT'), // 明确类型为 number
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'], // 自动加载所有实体（关键：确保 UserEntity 被识别）
        synchronize: true, // 开发环境可用（生产环境禁用）
        logging: true, // 开发环境打印 SQL，方便调试
        migrations: [],
        migrationsRun: false,
      }),
      // 注入 ConfigService，用于获取环境变量（必须声明）
      inject: [ConfigService],
    }),
    UserModule,
  ],
  providers: [],
})
export class AppModule {}
