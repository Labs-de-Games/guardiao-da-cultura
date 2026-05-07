import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsEmail,
  IsString,
  Length,
  Matches,
} from "class-validator";

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
  @IsDateString()
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
}
