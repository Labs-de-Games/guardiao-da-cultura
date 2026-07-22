import { Type } from "class-transformer";
import { IsArray, IsIn, IsString, ValidateNested } from "class-validator";

class CollectibleRecordDto {
  @IsString()
  collectibleId!: string;

  @IsString()
  @IsIn(["CLUE_VILLAIN"])
  collectibleType!: "CLUE_VILLAIN";

  @IsString()
  levelId!: string;
}

export class SaveCollectiblesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CollectibleRecordDto)
  collectibles!: CollectibleRecordDto[];
}
