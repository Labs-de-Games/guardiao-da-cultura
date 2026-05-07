import { Controller, Get } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Public } from "../../modules/auth/decorators/public.decorator";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  @Public()
  @Get()
  @ApiOperation({ summary: "Health check" })
  @ApiOkResponse({
    description: "Service is healthy",
    schema: { example: { status: "ok" } },
  })
  health() {
    return { status: "ok" };
  }
}
