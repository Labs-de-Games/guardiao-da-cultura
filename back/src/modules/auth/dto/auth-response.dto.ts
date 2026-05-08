import { ApiProperty } from "@nestjs/swagger";
import { Role } from "../../users/enums/role.enum";

export class AuthUserDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "User unique identifier",
  })
  id!: string;

  @ApiProperty({
    example: "john@example.com",
    description: "User email address",
  })
  email!: string;

  @ApiProperty({ example: "johndoe123", description: "User nickname" })
  nickname!: string;

  @ApiProperty({ example: "John", description: "User first name" })
  firstName!: string;

  @ApiProperty({ example: "Doe", description: "User last name" })
  lastName!: string;

  @ApiProperty({ enum: Role, example: Role.Player, description: "User role" })
  role!: Role;

  @ApiProperty({
    example: true,
    description: "Whether the user's email is verified",
  })
  isEmailVerified!: boolean;
}

export class AuthResponseDto {
  @ApiProperty({
    example: "eyJhbGciOiJIUzI1NiIs...",
    description: "JWT access token",
  })
  accessToken!: string;

  @ApiProperty({ type: AuthUserDto, description: "Authenticated user data" })
  user!: AuthUserDto;
}
