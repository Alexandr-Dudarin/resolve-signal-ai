import { PublicDemoEndpoint } from "../demo-access/demo-access.config.js";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("health")
@Controller("health")
export class HealthController {
  @Get()
  @PublicDemoEndpoint()
  @ApiOperation({ summary: "API health check" })
  check() {
    return { status: "ok", service: "resolve-signal-api" };
  }
}
