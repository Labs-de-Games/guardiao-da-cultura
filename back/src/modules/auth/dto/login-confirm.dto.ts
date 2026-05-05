import { IsString } from "class-validator";

export class LoginConfirmDto {
  @IsString()
  token!: string;
}
