import { Exclude } from 'class-transformer';
import { Column, Entity } from 'typeorm';
import { CommonEntity } from '~/common/entity/common.entity';

@Entity({ name: 'sys_user' })
export class UserEntity extends CommonEntity {
  @Column({ unique: true })
  username: string;

  // 使用 Class-Transformer 隐藏敏感字段，需配合全局序列化拦截器
  @Exclude()
  @Column()
  password: string;

  // 为密码哈希增加随机盐，抵御彩虹表攻击
  @Exclude()
  @Column({ name: 'password_salt' })
  passwordSalt: string;
}
