import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { ServerResponse } from "node:http";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { DemoSession } from "@resolve-signal/contracts";
import type { ApiEnv } from "../../app/env.js";
import { DEMO_CONFIG, type DemoRequest } from "./demo-access.config.js";
import { DemoRateLimitErrorException } from "./demo-rate-limiter.js";

@Injectable()
export class DemoSessionService {
  private readonly sessions = new Map<string, number>();
  private readonly codeHash: Buffer;
  readonly cookieName: string;

  constructor(@Inject(DEMO_CONFIG) readonly config: ApiEnv) {
    this.codeHash = createHash("sha256").update(config.DEMO_ACCESS_CODE ?? "").digest();
    this.cookieName = config.NODE_ENV === "production" ? "__Host-resolve_demo" : "resolve_demo";
  }

  private prune(now: number) {
    for (const [id, expiry] of this.sessions) if (expiry <= now) this.sessions.delete(id);
  }

  private signature(payload: string) {
    return createHmac("sha256", this.config.DEMO_SESSION_SECRET ?? "").update(payload).digest("base64url");
  }

  private verified(request: DemoRequest, now = Date.now()) {
    this.prune(now);
    const values = (request.headers.cookie ?? "").split(";")
      .map((part) => part.trim()).filter((part) => part.startsWith(`${this.cookieName}=`));
    if (values.length !== 1) return null;
    const token = values[0]!.slice(this.cookieName.length + 1);
    if (!/^[A-Za-z0-9_-]{32}\.\d{13}\.[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const [id, expiry, signature] = token.split(".") as [string, string, string];
    const expected = this.signature(`${id}.${expiry}`);
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const expiresAt = Number(expiry);
    if (expiresAt <= now || this.sessions.get(id) !== expiresAt) return null;
    return { id, expiresAt };
  }

  status(request: DemoRequest): DemoSession {
    if (!this.config.DEMO_ACCESS_ENABLED) return { enabled: false, authenticated: true, expiresAt: null };
    const session = this.verified(request);
    return { enabled: true, authenticated: Boolean(session), expiresAt: session ? new Date(session.expiresAt).toISOString() : null };
  }

  login(code: string, request: DemoRequest, response: ServerResponse): DemoSession {
    if (!this.config.DEMO_ACCESS_ENABLED) return this.status(request);
    const candidate = createHash("sha256").update(code).digest();
    if (!timingSafeEqual(this.codeHash, candidate)) throw new UnauthorizedException("Неверный код доступа.");
    const now = Date.now();
    this.prune(now);
    const previous = this.verified(request, now);
    if (!previous && this.sessions.size >= 1000) throw new DemoRateLimitErrorException("sessions", 60);
    if (previous) this.sessions.delete(previous.id);
    const id = randomBytes(24).toString("base64url");
    const expiry = now + this.config.DEMO_SESSION_TTL_SECONDS * 1000;
    const payload = `${id}.${expiry}`;
    this.sessions.set(id, expiry);
    this.setCookie(response, `${payload}.${this.signature(payload)}`, this.config.DEMO_SESSION_TTL_SECONDS);
    return { enabled: true, authenticated: true, expiresAt: new Date(expiry).toISOString() };
  }

  logout(request: DemoRequest, response: ServerResponse): DemoSession {
    const session = this.verified(request);
    if (session) this.sessions.delete(session.id);
    this.setCookie(response, "", 0);
    return { enabled: this.config.DEMO_ACCESS_ENABLED, authenticated: !this.config.DEMO_ACCESS_ENABLED, expiresAt: null };
  }

  private setCookie(response: ServerResponse, value: string, maxAge: number) {
    response.setHeader("Set-Cookie", `${this.cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${this.config.NODE_ENV === "production" ? "; Secure" : ""}`);
  }
}
