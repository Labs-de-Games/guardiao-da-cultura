import { ApiProperty } from "@nestjs/swagger";
import { IsString, Length } from "class-validator";

export class PasswordResetConfirmDto {
  @ApiProperty({ description: "Raw password-reset token from the email link" })
  @IsString()
  token!: string;

  @ApiProperty({
    example: "New-Correct-Horse-Battery9",
    minLength: 12,
  })
  @IsString()
  @Length(12, 128)
  newPassword!: string;
}
