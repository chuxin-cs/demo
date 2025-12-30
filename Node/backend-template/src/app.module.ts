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
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get('DB_USER'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: true,
        logging: true,
        migrations: [],
        migrationsRun: false,
      }),
      inject: [ConfigService],
    }),
    UserModule,
  ],
  providers: [],
})
export class AppModule {}
