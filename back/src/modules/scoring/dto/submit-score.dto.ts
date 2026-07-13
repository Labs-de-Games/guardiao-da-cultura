import { Type } from "class-transformer";
import {
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

class FloorScoreDto {
  @IsInt()
  @Min(0)
  floorIndex!: number;

  @IsInt()
  @Min(0)
  errors!: number;

  @IsInt()
  @Min(0)
  quartersEarned!: number;
}

class QuizScoreDto {
  @IsInt()
  @Min(0)
  totalQuestions!: number;

  @IsInt()
  @Min(0)
  correctAnswers!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  accuracyPercent!: number;

  @IsInt()
  @Min(0)
  quartersEarned!: number;
}

class IntermediateQuizScoreDto {
  @IsInt()
  @Min(0)
  total!: number;

  @IsInt()
  @Min(0)
  passed!: number;

  @IsInt()
  @Min(0)
  quartersEarned!: number;
}

class CollectibleRecordDto {
  @IsString()
  collectibleId!: string;

  @IsString()
  @IsIn(["CLUE_VILLAIN"])
  collectibleType!: "CLUE_VILLAIN";

  @IsString()
  levelId!: string;
}

export class SubmitScoreDto {
  @IsUUID()
  userId!: string;

  @IsString()
  levelId!: string;

  @IsInt()
  @Min(0)
  totalQuarters!: number;

  @IsNumber()
  @Min(0)
  totalStars!: number;

  @IsString()
  rating!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FloorScoreDto)
  floors!: FloorScoreDto[];

  @ValidateNested()
  @Type(() => QuizScoreDto)
  quiz!: QuizScoreDto;

  @ValidateNested()
  @Type(() => IntermediateQuizScoreDto)
  intermediateQuizzes!: IntermediateQuizScoreDto;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CollectibleRecordDto)
  collectedCollectibles?: CollectibleRecordDto[];
}
