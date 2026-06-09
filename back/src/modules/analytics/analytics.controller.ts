import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Role } from "../users/enums/role.enum";

@ApiTags("Analytics & Metrics")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Institution, Role.Admin)
@Controller("analytics")
export class AnalyticsController {
  @Get("aggregated")
  @ApiOperation({
    summary: "Get aggregated institutional metrics for dashboard",
  })
  async getAggregatedMetrics() {
    return {
      totalStudents: 154,
      activeStudents: 128,
      averageCompletionRate: 74.2,
      totalStarsCollected: 2450,
      averageQuizAccuracy: 81.5,
      recentActivity: [
        {
          id: "1",
          nickname: "GamerPro",
          action: "badge.earned",
          detail: "Badge 'Historiador'",
          timestamp: new Date(),
        },
        {
          id: "2",
          nickname: "SophiaArtes",
          action: "level.completed",
          detail: "Level 3 - Barroco",
          timestamp: new Date(),
        },
      ],
      studentsWithDifficulty: [
        {
          nickname: "Lucas12",
          levelName: "Fase 2 - Modernismo",
          attempts: 4,
          status: "failed",
        },
        {
          nickname: "Beatriz_M",
          levelName: "Quiz Final",
          attempts: 3,
          status: "struggling",
        },
      ],
    };
  }

  @Get("classes")
  @ApiOperation({ summary: "Get metrics grouped by school class" })
  async getClassesMetrics() {
    return [
      {
        id: "class-a",
        name: "5º Ano A",
        studentsCount: 28,
        completionRate: 85,
        averageStars: 18.4,
      },
      {
        id: "class-b",
        name: "6º Ano B",
        studentsCount: 32,
        completionRate: 78,
        averageStars: 16.1,
      },
      {
        id: "class-c",
        name: "7º Ano A",
        studentsCount: 30,
        completionRate: 60,
        averageStars: 12.8,
      },
    ];
  }
}
