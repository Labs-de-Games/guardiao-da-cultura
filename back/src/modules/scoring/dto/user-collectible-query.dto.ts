import { IsIn, IsOptional, IsString } from "class-validator";

export class UserCollectibleQueryDto {
  @IsOptional()
  @IsString()
  levelId?: string;

  @IsOptional()
  @IsString()
  @IsIn(["COLLECT", "CLUE_VILLAIN", "CLUE_NEXT"])
  collectibleType?: "COLLECT" | "CLUE_VILLAIN" | "CLUE_NEXT";
}
