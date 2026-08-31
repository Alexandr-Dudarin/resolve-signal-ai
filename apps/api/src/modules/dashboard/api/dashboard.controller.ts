import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service.js";

@ApiTags("dashboard")
@Controller("api/v1/dashboard")
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  @Get("summary")
  @ApiOperation({ summary: "Get dashboard metrics and recent feedback" })
  summary() {
    return this.dashboardService.summary();
  }
}
