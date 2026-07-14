import { IsNumber, IsOptional, IsString, Max, Min } from "class-validator";

export class SynthesizeDto {
  @IsString()
  text!: string;

  @IsOptional()
  @IsString()
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(3)
  rate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  pitch?: number;
}
