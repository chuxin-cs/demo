import { UserService } from './user.service';
import {
  Body,
  Controller,
  Delete,
  Get,
  Query,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Res,
} from '@nestjs/common';
import {
  CreateUserDto,
  IdsDto,
  QueryUserListDto,
  UpdatePasswordDto,
  UpdateUserDto,
} from '~/modules/user/user.dto';
import type { Response } from 'express';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  list(@Query() query: QueryUserListDto) {
    return this.userService.list(query);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findUserById({ id });
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.userService.delete(id);
    return { success: true };
  }

  @Patch(':id/disable')
  async disable(@Param('id', ParseIntPipe) id: number) {
    await this.userService.disable(id);
    return { success: true };
  }

  @Patch(':id/enable')
  async enable(@Param('id', ParseIntPipe) id: number) {
    await this.userService.enable(id);
    return { success: true };
  }

  @Patch(':id/password')
  async updatePassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePasswordDto,
  ) {
    await this.userService.updatePassword(id, dto);
    return { success: true };
  }

  @Post('batch/delete')
  async batchDelete(@Body() dto: IdsDto) {
    await this.userService.batchDelete(dto.ids);
    return { success: true };
  }

  @Post('batch/disable')
  async batchDisable(@Body() dto: IdsDto) {
    await this.userService.batchDisable(dto.ids);
    return { success: true };
  }

  @Post('batch/enable')
  async batchEnable(@Body() dto: IdsDto) {
    await this.userService.batchEnable(dto.ids);
    return { success: true };
  }

  @Get('export')
  export(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
    const stream = this.userService.exportCsvStream();
    stream.pipe(res);
  }
}
