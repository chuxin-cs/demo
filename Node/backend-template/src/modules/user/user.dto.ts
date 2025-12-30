import {
  IsArray,
  ArrayNotEmpty,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  username?: string;
}

export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class IdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  ids: number[];
}

export class QueryUserListDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  pageSize?: number;

  @IsOptional()
  @IsString()
  q?: string;

  // 是否包含已软删除用户
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  withDeleted?: number; // 0/1
}
