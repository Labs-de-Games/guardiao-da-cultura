import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Role } from "../users/enums/role.enum";
import { DashboardService } from "./dashboard.service";
import { DashboardMetricsDto } from "./dto/dashboard-metrics.dto";
import { DashboardQueryDto } from "./dto/dashboard-query.dto";

@ApiTags("Dashboard")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Institution, Role.Admin)
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("metrics")
  @ApiOperation({ summary: "Get dashboard metrics" })
  @ApiOkResponse({ type: DashboardMetricsDto })
  getMetrics(@Query() query: DashboardQueryDto): DashboardMetricsDto {
    return this.dashboardService.getMetrics(query.dateRange);
  }
}
