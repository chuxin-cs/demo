import { UserService } from './user.service';
import { Controller, Get, Query } from '@nestjs/common';
import { UserDto } from '~/modules/user/user.dto';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  list() {
    return this.userService.list();
  }

  @Get(':id')
  async findOne(id: number) {
    return this.userService.findUserById({ id });
  }

  @Get('add')
  async add(@Query() dto: UserDto) {
    return this.userService.create(dto);
  }
}
