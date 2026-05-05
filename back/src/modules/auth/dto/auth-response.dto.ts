import type { Role } from "../../users/enums/role.enum";

export class AuthUserDto {
  id!: string;
  email!: string;
  nickname!: string;
  firstName!: string;
  lastName!: string;
  role!: Role;
  isEmailVerified!: boolean;
}

export class AuthResponseDto {
  accessToken!: string;
  user!: AuthUserDto;
}
