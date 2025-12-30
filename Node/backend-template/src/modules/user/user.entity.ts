import { Exclude } from 'class-transformer';
import { Column, Entity } from 'typeorm';
import { CommonEntity } from '~/common/entity/common.entity';

@Entity({ name: 'sys_user' })
export class UserEntity extends CommonEntity {
  @Column({ unique: true })
  username: string;

  //Exclude 对数据进行脱密 不映射和返回到前端
  @Exclude()
  @Column()
  password: string;
}
