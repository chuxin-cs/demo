import { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

// 集中管理数据库配置，按环境区分日志与结构同步
export function createTypeOrmOptions(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    type: 'mysql',
    host: configService.get<string>('DB_HOST'),
    port: configService.get<number>('DB_PORT'),
    username: configService.get<string>('DB_USER'),
    password: configService.get<string>('DB_PASSWORD'),
    database: configService.get<string>('DB_NAME'),
    // 兼容 ts/js 两种产物
    entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
    synchronize: !isProd, // 生产环境禁用自动同步
    logging: !isProd, // 开发环境打印 SQL
    migrations: [],
    migrationsRun: false,
  };
}
