import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException, UnsupportedMediaTypeException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ApiEnv } from "../../app/env.js";
import { normalizeClientIp } from "../../common/http/client-ip.js";
import { DEMO_CONFIG, DEMO_CREATE, DEMO_PUBLIC, type DemoRequest } from "./demo-access.config.js";
import { DemoRateLimiter } from "./demo-rate-limiter.js";
import { DemoSessionService } from "./demo-session.service.js";

@Injectable()
export class DemoAccessGuard implements CanActivate {
  constructor(
    @Inject(DEMO_CONFIG) private readonly config: ApiEnv,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DemoSessionService) private readonly sessions: DemoSessionService,
    @Inject(DemoRateLimiter) private readonly limiter: DemoRateLimiter,
  ) {}

  canActivate(context: ExecutionContext) {
    if (!this.config.DEMO_ACCESS_ENABLED) return true;
    const request = context.switchToHttp().getRequest<DemoRequest>();
    const publicEndpoint = this.reflector.get<boolean>(DEMO_PUBLIC, context.getHandler());
    if (!publicEndpoint && !this.sessions.status(request).authenticated) throw new UnauthorizedException("Введите код доступа к демо.");
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(request.method ?? "");
    if (unsafe) {
      if (request.headers.origin !== this.config.CORS_ORIGIN) throw new ForbiddenException("Недопустимый источник запроса.");
      if (request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        throw new UnsupportedMediaTypeException("Ожидается JSON-запрос.");
      }
      // Session routes have their own login limiter; no new identity from raw XFF.
      if (!publicEndpoint) this.limiter.reserve("write", normalizeClientIp(request.ip ?? "unknown"), this.reflector.get<boolean>(DEMO_CREATE, context.getHandler()) ?? false);
    }
    return true;
  }
}
