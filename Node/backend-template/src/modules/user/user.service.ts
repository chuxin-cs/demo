import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '~/modules/user/user.entity';
import { Like, Repository } from 'typeorm';
import {
  CreateUserDto,
  QueryUserListDto,
  UpdatePasswordDto,
  UpdateUserDto,
} from '~/modules/user/user.dto';
import * as crypto from 'crypto';
import * as util from 'node:util';
import { PassThrough } from 'stream';
const scryptAsync = util.promisify(crypto.scrypt);

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  // 列表分页查询，支持模糊搜索与软删除控制
  async list(query?: QueryUserListDto): Promise<{
    list: UserEntity[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = Math.max(1, query?.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, query?.pageSize ?? 10));
    const where: Record<string, any> = {};
    if (query?.q) {
      where.username = Like(`%${query.q}%`);
    }
    const [list, total] = await this.userRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      withDeleted: !!query?.withDeleted,
      order: { id: 'DESC' },
    });
    return { list, total, page, pageSize };
  }

  async findUserById(dto: { id: number }): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { id: dto.id },
    });
  }

  // 使用 scrypt + 随机盐进行密码哈希，更安全
  private async hashPassword(password: string, salt: string): Promise<string> {
    const key = (await scryptAsync(password, salt, 32)) as Buffer;
    return key.toString('hex');
  }

  private isDuplicateError(e: unknown): e is { code?: string } {
    return (
      typeof e === 'object' &&
      e !== null &&
      (e as { code?: string }).code === 'ER_DUP_ENTRY'
    );
  }

  async create(dto: CreateUserDto): Promise<UserEntity> {
    const exists = await this.userRepository.findOne({
      where: { username: dto.username },
      withDeleted: true,
    });
    if (exists) {
      throw new ConflictException('用户名已存在');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    const entity = this.userRepository.create({
      username: dto.username,
      password: await this.hashPassword(dto.password, salt),
      passwordSalt: salt,
    });
    try {
      return await this.userRepository.save(entity);
    } catch (e: unknown) {
      // 并发场景下依赖数据库唯一约束兜底
      if (this.isDuplicateError(e)) {
        throw new ConflictException('用户名已存在');
      }
      throw e;
    }
  }

  async update(id: number, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    if (dto.username) {
      const conflict = await this.userRepository.findOne({
        where: { username: dto.username },
        withDeleted: true,
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('用户名已存在');
      }
      user.username = dto.username;
    }
    try {
      return await this.userRepository.save(user);
    } catch (e: unknown) {
      if (this.isDuplicateError(e)) {
        throw new ConflictException('用户名已存在');
      }
      throw e;
    }
  }

  async delete(id: number): Promise<void> {
    const res = await this.userRepository.delete(id);
    if (res.affected === 0) {
      throw new NotFoundException('用户不存在');
    }
  }

  async disable(id: number): Promise<void> {
    const res = await this.userRepository.softDelete(id);
    if (res.affected === 0) {
      throw new NotFoundException('用户不存在');
    }
  }

  async enable(id: number): Promise<void> {
    const res = await this.userRepository.restore(id);
    if (res.affected === 0) {
      throw new NotFoundException('用户不存在');
    }
  }

  async updatePassword(id: number, dto: UpdatePasswordDto): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    const salt = crypto.randomBytes(16).toString('hex');
    user.passwordSalt = salt;
    user.password = await this.hashPassword(dto.password, salt);
    await this.userRepository.save(user);
  }

  async batchDelete(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await this.userRepository.manager.transaction(async (manager) => {
      await manager.delete(UserEntity, ids);
    });
  }

  async batchDisable(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await this.userRepository.manager.transaction(async (manager) => {
      await manager.softDelete(UserEntity, ids);
    });
  }

  async batchEnable(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await this.userRepository.manager.transaction(async (manager) => {
      await manager.restore(UserEntity, ids);
    });
  }

  // 大数据量导出：分批读取，避免占用大量内存
  async exportCsv(): Promise<string> {
    const header = ['id', 'username', 'created_at', 'updated_at'];
    const batchSize = 1000;
    let offset = 0;
    const chunks: string[] = [header.join(',')];
    // 分批读取直至数据耗尽
    // 在高并发场景可以改为流式写入 Response（见控制器说明）
    // 这里返回字符串以保持简单的集成
    // 注意：ClassSerializerInterceptor 会自动脱敏 password 字段
    // 导出不包含敏感字段
    while (true) {
      const batch = await this.userRepository.find({
        skip: offset,
        take: batchSize,
        order: { id: 'ASC' },
      });
      if (batch.length === 0) break;
      for (const u of batch) {
        const row = [
          u.id,
          u.username,
          u.createdAt?.toISOString() ?? '',
          u.updatedAt?.toISOString() ?? '',
        ].join(',');
        chunks.push(row);
      }
      offset += batch.length;
    }
    return chunks.join('\n');
  }

  // 流式导出，适合数据量更大时避免占用大量内存
  exportCsvStream(): PassThrough {
    const stream = new PassThrough();
    const header =
      ['id', 'username', 'created_at', 'updated_at'].join(',') + '\n';
    stream.write(header);
    const batchSize = 1000;
    let offset = 0;
    void (async () => {
      try {
        while (true) {
          const batch = await this.userRepository.find({
            skip: offset,
            take: batchSize,
            order: { id: 'ASC' },
          });
          if (batch.length === 0) break;
          for (const u of batch) {
            const row =
              [
                u.id,
                u.username,
                u.createdAt?.toISOString() ?? '',
                u.updatedAt?.toISOString() ?? '',
              ].join(',') + '\n';
            if (!stream.write(row)) {
              // 背压处理：等待 drain 事件
              await new Promise((resolve) => stream.once('drain', resolve));
            }
          }
          offset += batch.length;
        }
      } finally {
        stream.end();
      }
    })();
    return stream;
  }
}
