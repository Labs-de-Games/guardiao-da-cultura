import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional } from "class-validator";

export enum DateRange {
  LAST_7_DAYS = "last-7-days",
  LAST_30_DAYS = "last-30-days",
  ALL_TIME = "all-time",
}

export class DashboardQueryDto {
  @ApiPropertyOptional({ enum: DateRange, default: DateRange.LAST_30_DAYS })
  @IsEnum(DateRange)
  @IsOptional()
  dateRange?: DateRange = DateRange.LAST_30_DAYS;
}
