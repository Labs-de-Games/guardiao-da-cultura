import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNumber,
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

class collectibleScoreDto {
  @IsInt()
  @Min(0)
  total!: number;

  @IsInt()
  @Min(0)
  interactionsCount!: number;

  @IsInt()
  @Min(0)
  quartersEarned!: number;
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
  @Type(() => collectibleScoreDto)
  collectibles!: collectibleScoreDto;
}
