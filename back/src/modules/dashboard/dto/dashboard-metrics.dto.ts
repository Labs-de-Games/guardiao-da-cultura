import { ApiProperty } from "@nestjs/swagger";

export class FunnelMetricsDto {
  @ApiProperty({ example: 0.82 })
  loginCompletionRate!: number;

  @ApiProperty({ example: 0.95 })
  chapter1StartRate!: number;

  @ApiProperty({ example: 0.48 })
  chapter1CompletionRate!: number;
}

export class EngagementMetricsDto {
  @ApiProperty({ example: 3.5, description: "Average session time in minutes" })
  averageSessionTime!: number;

  @ApiProperty({ example: 250 })
  totalPlayers!: number;
}

export class PedagogicalMetricsDto {
  @ApiProperty({ example: 0.75 })
  quizSuccessRate!: number;

  @ApiProperty({ example: 3.8, description: "Average score from 0 to 5" })
  averageStarScore!: number;

  @ApiProperty({ example: 0.92 })
  objectInteractionRate!: number;
}

export class BadgeMetricsDto {
  @ApiProperty({ example: 0.3 })
  explorerRate!: number;

  @ApiProperty({ example: 0.25 })
  restauradorRate!: number;

  @ApiProperty({ example: 0.15 })
  curadorRate!: number;

  @ApiProperty({ example: 0.4 })
  detetiveRate!: number;

  @ApiProperty({ example: 0.6 })
  persistenteRate!: number;
}

export class TechnicalMetricsDto {
  @ApiProperty({ example: 0.98 })
  errorFreeSessionRate!: number;
}

export class DashboardMetricsDto {
  @ApiProperty({ type: FunnelMetricsDto })
  funnel!: FunnelMetricsDto;

  @ApiProperty({ type: EngagementMetricsDto })
  engagement!: EngagementMetricsDto;

  @ApiProperty({ type: PedagogicalMetricsDto })
  pedagogical!: PedagogicalMetricsDto;

  @ApiProperty({ type: BadgeMetricsDto })
  badges!: BadgeMetricsDto;

  @ApiProperty({ type: TechnicalMetricsDto })
  technical!: TechnicalMetricsDto;
}
