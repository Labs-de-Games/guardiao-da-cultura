import {
  IsDateString,
  IsEmail,
  IsString,
  Length,
  Matches,
} from "class-validator";

export class RegisterDto {
  @IsString()
  firstName!: string;

  @IsString()
  lastName!: string;

  @IsDateString()
  dateOfBirth!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @Length(3, 30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "nickname must be alphanumeric with underscores only",
  })
  nickname!: string;
}
