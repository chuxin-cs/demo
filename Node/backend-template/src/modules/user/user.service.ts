import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '~/modules/user/user.entity';
import { Repository } from 'typeorm';
import { UserDto } from '~/modules/user/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  list() {
    return '1111';
  }

  async findUserById(dto: { id: number }): Promise<UserEntity | null> {
    return this.userRepository
      .createQueryBuilder()
      .where({
        id: dto.id,
      })
      .getOne();
  }

  async create(dto: UserDto): Promise<void> {
    // const exists = await this.findUserById(dto);
    // if (!exists) {
    //   throw new NotFoundException('用户不存在或已禁用');
    // }
    return this.userRepository.save(dto);
  }
}
