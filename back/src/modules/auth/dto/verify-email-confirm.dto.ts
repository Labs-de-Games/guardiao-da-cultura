import { IsString } from "class-validator";

export class VerifyEmailConfirmDto {
  @IsString()
  token!: string;
}
