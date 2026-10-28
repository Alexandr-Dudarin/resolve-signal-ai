import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException, UnsupportedMediaTypeException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ApiEnv } from "../../app/env.js";
import { normalizeClientIp } from "../../common/http/client-ip.js";
import { DEMO_CONFIG, DEMO_CREATE, DEMO_PUBLIC, DEMO_GUEST_READ, DEMO_GUEST_WRITE, type DemoRequest } from "./demo-access.config.js";
import { DemoRateLimiter } from "./demo-rate-limiter.js";
import { DemoSessionService } from "./demo-session.service.js";
import { GuestAccessService } from "./guest-access.service.js";

@Injectable()
export class DemoAccessGuard implements CanActivate {
  constructor(
    @Inject(DEMO_CONFIG) private readonly config: ApiEnv,
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(DemoSessionService) private readonly sessions: DemoSessionService,
    @Inject(DemoRateLimiter) private readonly limiter: DemoRateLimiter,
    @Inject(GuestAccessService) private readonly guests: GuestAccessService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (!this.config.DEMO_ACCESS_ENABLED) return true;
    const request = context.switchToHttp().getRequest<DemoRequest>();
    const publicEndpoint = this.reflector.get<boolean>(DEMO_PUBLIC, context.getHandler());
    const unsafe = !["GET", "HEAD", "OPTIONS"].includes(request.method ?? "");
    const guest = this.config.DEMO_ACCESS_MODE === "guest";
    const ip = normalizeClientIp(request.ip ?? "unknown");
    if (guest) {
      const readable = this.reflector.get<boolean>(DEMO_GUEST_READ, context.getHandler());
      const writable = this.reflector.get<boolean>(DEMO_GUEST_WRITE, context.getHandler());
      if (!publicEndpoint && !(unsafe ? writable : readable)) throw new ForbiddenException();
      // Admission cap runs before cookie/DB lookup, including anonymous write
      // attempts with syntactically valid but fabricated session cookies.
      if (readable || unsafe) this.limiter.reserve("read", ip);
      if (!publicEndpoint) {
        const session = await this.guests.resolve(request);
        request.guestActor = { ownerKey: session?.ownerKey ?? null };
        if (unsafe && !session) throw new UnauthorizedException();
      }
    } else if (!publicEndpoint && !this.sessions.status(request).authenticated) {
      throw new UnauthorizedException("Введите код доступа к демо.");
    }
    if (unsafe) {
      if (request.headers.origin !== this.config.CORS_ORIGIN) throw new ForbiddenException("Недопустимый источник запроса.");
      if (request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        throw new UnsupportedMediaTypeException("Ожидается JSON-запрос.");
      }
      // Session routes have their own login limiter; no new identity from raw XFF.
      if (!publicEndpoint || guest) this.limiter.reserve("write", ip, this.reflector.get<boolean>(DEMO_CREATE, context.getHandler()) ?? false);
    }
    return true;
  }
}
