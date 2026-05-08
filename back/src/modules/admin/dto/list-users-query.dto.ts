import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { Role } from "../../users/enums/role.enum";

export class ListUsersQueryDto {
  @ApiPropertyOptional({
    example: 1,
    description: "Page number",
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({
    example: 20,
    description: "Items per page",
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({
    example: "john",
    description: "Search query for user name or email",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.Player,
    description: "Filter by user role",
  })
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({
    example: true,
    description: "Filter by active status",
  })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;
}
