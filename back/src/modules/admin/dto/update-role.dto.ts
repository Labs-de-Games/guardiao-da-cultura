import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { Role } from "../../users/enums/role.enum";

export class UpdateRoleDto {
  @ApiProperty({
    enum: Role,
    example: Role.Player,
    description: "New role for the user",
  })
  @IsEnum(Role)
  role!: Role;
}
