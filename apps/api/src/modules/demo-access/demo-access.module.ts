import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { getApiEnv } from "../../app/env.js";
import { DEMO_CONFIG } from "./demo-access.config.js";
import { DemoAccessController } from "./demo-access.controller.js";
import { DemoAccessGuard } from "./demo-access.guard.js";
import { DemoRateLimiter } from "./demo-rate-limiter.js";
import { DemoSessionService } from "./demo-session.service.js";
import { PrismaModule } from "../../app/prisma.module.js";
import { GuestAccessService } from "./guest-access.service.js";
import { GUEST_REPOSITORY } from "./guest.repository.js";
import { PrismaGuestRepository } from "./prisma-guest.repository.js";

@Module({
  imports: [PrismaModule],
  controllers: [DemoAccessController],
  providers: [
    { provide: DEMO_CONFIG, useFactory: () => getApiEnv() },
    DemoSessionService,
    DemoRateLimiter,
    GuestAccessService,
    { provide: GUEST_REPOSITORY, useClass: PrismaGuestRepository },
    { provide: APP_GUARD, useClass: DemoAccessGuard },
  ],
  exports: [GuestAccessService],
})
export class DemoAccessModule {}
