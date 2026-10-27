import { Body, Controller, Get, HttpCode, Inject, NotFoundException, Post, Req, Res, UnauthorizedException } from "@nestjs/common";
import type { ServerResponse } from "node:http";
import { DemoLoginSchema } from "@resolve-signal/contracts";
import { normalizeClientIp } from "../../common/http/client-ip.js";
import { GuestReadable, PublicDemoEndpoint, type DemoRequest } from "./demo-access.config.js";
import { DemoRateLimiter } from "./demo-rate-limiter.js";
import { DemoSessionService } from "./demo-session.service.js";
import { GuestAccessService } from "./guest-access.service.js";

@Controller("api/v1/demo/session")
export class DemoAccessController {
  constructor(
    @Inject(DemoSessionService) private readonly sessions: DemoSessionService,
    @Inject(DemoRateLimiter) private readonly limiter: DemoRateLimiter,
    @Inject(GuestAccessService) private readonly guests: GuestAccessService,
  ) {}

  @Get()
  @PublicDemoEndpoint()
  @GuestReadable()
  status(@Req() request: DemoRequest) {
    return this.sessions.config.DEMO_ACCESS_MODE === "guest" ? this.guests.status(request) : this.sessions.status(request);
  }

  @Post("guest")
  @HttpCode(200)
  @PublicDemoEndpoint()
  guest(@Req() request: DemoRequest, @Res({ passthrough: true }) response: ServerResponse) {
    if (this.sessions.config.DEMO_ACCESS_MODE !== "guest") throw new NotFoundException();
    this.limiter.reserve("guest", normalizeClientIp(request.ip ?? "unknown"));
    return this.guests.start(request, response);
  }

  @Post()
  @HttpCode(200)
  @PublicDemoEndpoint()
  login(@Body() body: unknown, @Req() request: DemoRequest, @Res({ passthrough: true }) response: ServerResponse) {
    if (this.sessions.config.DEMO_ACCESS_MODE === "guest") throw new NotFoundException();
    if (this.sessions.config.DEMO_ACCESS_ENABLED) this.limiter.reserve("login", normalizeClientIp(request.ip ?? "unknown"));
    const parsed = DemoLoginSchema.safeParse(body);
    if (!parsed.success) throw new UnauthorizedException("Неверный код доступа.");
    return this.sessions.login(parsed.data.code, request, response);
  }

  @Post("logout")
  @HttpCode(200)
  @PublicDemoEndpoint()
  logout(@Req() request: DemoRequest, @Res({ passthrough: true }) response: ServerResponse) {
    if (this.sessions.config.DEMO_ACCESS_MODE === "guest") return this.guests.logout(request, response);
    return this.sessions.logout(request, response);
  }
}
