import { ApiProperty } from "@nestjs/swagger";
import { IsEmail } from "class-validator";

export class LoginDto {
  @ApiProperty({
    example: "john@example.com",
    description: "User email address",
  })
  @IsEmail()
  email!: string;
}
