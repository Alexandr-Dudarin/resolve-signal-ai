import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { getApiEnv } from "../../app/env.js";
import { DEMO_CONFIG } from "./demo-access.config.js";
import { DemoAccessController } from "./demo-access.controller.js";
import { DemoAccessGuard } from "./demo-access.guard.js";
import { DemoRateLimiter } from "./demo-rate-limiter.js";
import { DemoSessionService } from "./demo-session.service.js";

@Module({
  controllers: [DemoAccessController],
  providers: [
    { provide: DEMO_CONFIG, useFactory: () => getApiEnv() },
    DemoSessionService,
    DemoRateLimiter,
    { provide: APP_GUARD, useClass: DemoAccessGuard },
  ],
})
export class DemoAccessModule {}
