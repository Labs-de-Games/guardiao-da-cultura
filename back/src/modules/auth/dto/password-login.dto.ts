import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength } from "class-validator";

export class PasswordLoginDto {
  @ApiProperty({ example: "institution@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Correct-Horse-Battery-Staple9" })
  @IsString()
  @MinLength(1)
  password!: string;
}
