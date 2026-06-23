import { IsEmail, IsString } from "class-validator";

export class CreateUserInterestedDto {
  @IsString()
  @IsEmail()
  email!: string;
}
