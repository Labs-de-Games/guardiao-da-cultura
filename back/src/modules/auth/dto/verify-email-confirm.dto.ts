import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class VerifyEmailConfirmDto {
  @ApiProperty({
    example: "abc123",
    description: "Email verification token received via email",
  })
  @IsString()
  token!: string;
}
