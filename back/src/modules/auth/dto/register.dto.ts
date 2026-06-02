import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
} from "class-validator";
import { IsValidDate } from "../../../common/validators/is-valid-date.decorator";
import { Role } from "../../users/enums/role.enum";

export class RegisterDto {
  @ApiProperty({ example: "John", description: "User first name" })
  @IsString()
  firstName!: string;

  @ApiProperty({ example: "Doe", description: "User last name" })
  @IsString()
  lastName!: string;

  @ApiProperty({
    example: "1990-01-01",
    description: "User date of birth (ISO 8601 format)",
  })
  @IsValidDate()
  dateOfBirth!: string;

  @ApiProperty({
    example: "john@example.com",
    description: "User email address",
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: "johndoe123",
    description:
      "User nickname (3-30 chars, alphanumeric and underscores only)",
    minLength: 3,
    maxLength: 30,
  })
  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "nickname must be alphanumeric with underscores only",
  })
  nickname!: string;

  @ApiPropertyOptional({
    enum: [Role.Institution],
    description:
      "Optional role for institutional signup. When omitted, defaults to player.",
    example: Role.Institution,
  })
  @IsOptional()
  @IsIn([Role.Institution])
  role?: Role.Institution;
}
