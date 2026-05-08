import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class LoginConfirmDto {
  @ApiProperty({
    example: "abc123",
    description: "Magic link token received via email",
  })
  @IsString()
  token!: string;
}
