import { IsIn, IsOptional, IsString } from "class-validator";

export class UserCollectibleQueryDto {
  @IsOptional()
  @IsString()
  levelId?: string;

  @IsOptional()
  @IsString()
  @IsIn(["CLUE_VILLAIN"])
  collectibleType?: "CLUE_VILLAIN";
}
