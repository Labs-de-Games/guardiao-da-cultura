import { IsEnum } from "class-validator";
import { Role } from "../../users/enums/role.enum";

export class UpdateRoleDto {
  @IsEnum(Role)
  role!: Role;
}
