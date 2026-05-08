import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class ToggleUserStatusDto {
  @ApiProperty({ example: true, description: "New active status for the user" })
  @IsBoolean()
  isActive!: boolean;
}
