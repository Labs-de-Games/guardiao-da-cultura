import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";

export class CreateUserInterestedDto {
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @IsBoolean()
  is_interested!: boolean;
}
