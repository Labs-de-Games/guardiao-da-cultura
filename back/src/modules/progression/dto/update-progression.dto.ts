import { IsInt, IsNumber, IsObject, IsOptional, Min } from "class-validator";

export class UpdateProgressionDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  currentLevel?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalStars?: number;

  @IsObject()
  @IsOptional()
  completedLevels?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  clues?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  quizResults?: Record<string, unknown>;

  @IsObject()
  @IsOptional()
  intermediateQuizResults?: Record<string, unknown>;
}
