import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class PasswordResetRequestDto {
  @ApiProperty({ example: "institution@example.com" })
  @IsEmail()
  email!: string;
}
