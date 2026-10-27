import { createHmac, randomBytes } from "node:crypto";
import type { ServerResponse } from "node:http";
import { HttpException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import type { CreateFeedbackInput, DemoSession, FeedbackDetails } from "@resolve-signal/contracts";
import type { ApiEnv } from "../../app/env.js";
import { DEMO_CONFIG, type DemoRequest, type GuestActor } from "./demo-access.config.js";
import { DemoRateLimitErrorException } from "./demo-rate-limiter.js";
import { GUEST_REPOSITORY, type GuestRepository } from "./guest.repository.js";

@Injectable()
export class GuestAccessService {
  readonly cookieName: string;
  constructor(
    @Inject(DEMO_CONFIG) private readonly config: ApiEnv,
    @Inject(GUEST_REPOSITORY) private readonly repository: GuestRepository,
  ) {
    this.cookieName = config.NODE_ENV === "production" ? "__Host-resolve_guest" : "resolve_guest";
  }

  private key(token: string) {
    return createHmac("sha256", this.config.DEMO_SESSION_SECRET!).update(`guest:${token}`).digest("hex");
  }

  private token(request: DemoRequest) {
    const cookies = (request.headers.cookie ?? "").split(";").map((v) => v.trim())
      .filter((v) => v.startsWith(`${this.cookieName}=`));
    if (cookies.length !== 1) return null;
    const token = cookies[0]!.slice(this.cookieName.length + 1);
    return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
  }

  async resolve(request: DemoRequest) {
    const token = this.token(request);
    if (!token) return null;
    const ownerKey = this.key(token);
    const session = await this.repository.findSession(ownerKey);
    return session && session.expiresAt.getTime() > Date.now() ? { ownerKey, expiresAt: session.expiresAt } : null;
  }

  async status(request: DemoRequest): Promise<DemoSession> {
    const session = await this.resolve(request);
    return { mode: "guest", enabled: true, authenticated: Boolean(session), expiresAt: session?.expiresAt.toISOString() ?? null };
  }

  async start(request: DemoRequest, response: ServerResponse): Promise<DemoSession> {
    const current = await this.resolve(request);
    if (current) return { mode: "guest", enabled: true, authenticated: true, expiresAt: current.expiresAt.toISOString() };
    const token = randomBytes(32).toString("base64url");
    const session = await this.repository.createSession(this.key(token), this.config.DEMO_SESSION_TTL_SECONDS, this.config.DEMO_GUEST_MAX_SESSIONS);
    if (!session) throw new DemoRateLimitErrorException("sessions", 60);
    this.setCookie(response, token, this.config.DEMO_SESSION_TTL_SECONDS);
    return { mode: "guest", enabled: true, authenticated: true, expiresAt: session.expiresAt.toISOString() };
  }

  async logout(request: DemoRequest, response: ServerResponse): Promise<DemoSession> {
    const token = this.token(request);
    if (token) await this.repository.revokeSession(this.key(token));
    this.setCookie(response, "", 0);
    return { mode: "guest", enabled: true, authenticated: false, expiresAt: null };
  }

  private setCookie(response: ServerResponse, token: string, maxAge: number) {
    response.setHeader("Set-Cookie", `${this.cookieName}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${this.config.NODE_ENV === "production" ? "; Secure" : ""}`);
  }

  async create(input: CreateFeedbackInput, actor: GuestActor) {
    if (!actor.ownerKey) throw new UnauthorizedException();
    const result = await this.repository.createFeedback(input, actor.ownerKey, {
      maximum: this.config.DEMO_GUEST_MAX_RECORDS,
      perOwner: this.config.DEMO_GUEST_RECORDS_PER_SESSION,
      retentionHours: this.config.DEMO_GUEST_RETENTION_HOURS,
    });
    if (!result) throw new UnauthorizedException();
    if ("scope" in result) throw new DemoRateLimitErrorException(result.scope, result.retryAfterSeconds);
    return result.id;
  }

  async permissions(id: string, actor: GuestActor): Promise<NonNullable<FeedbackDetails["permissions"]>> {
    const ownership = await this.repository.ownership(id);
    if (!ownership) throw new NotFoundException();
    const expiresAt = ownership.guestExpiresAt?.toISOString() ?? null;
    const reason = !ownership.guestOwnerKey ? "shared_example"
      : !ownership.guestExpiresAt || ownership.guestExpiresAt.getTime() <= Date.now() ? "expired"
        : ownership.guestOwnerKey !== actor.ownerKey ? "other_guest" : null;
    return { canModify: reason === null, reason, expiresAt };
  }

  async assertWritable(id: string, actor: GuestActor) {
    if (!actor.ownerKey) throw new UnauthorizedException();
    const permissions = await this.permissions(id, actor);
    if (!permissions.canModify) throw new HttpException({ code: "DEMO_READ_ONLY" }, 403);
    return permissions;
  }

  async assertReplyWritable(id: string, actor: GuestActor) {
    const feedbackId = await this.repository.replyFeedbackId(id);
    if (!feedbackId) throw new NotFoundException();
    await this.assertWritable(feedbackId, actor);
  }

  async reserveAiOperation(id: string, actor: GuestActor) {
    const permissions = await this.assertWritable(id, actor);
    if (!await this.repository.reserveAiOperation(id, actor.ownerKey!, this.config.DEMO_GUEST_AI_OPERATIONS_PER_RECORD)) {
      await this.assertWritable(id, actor);
      throw new DemoRateLimitErrorException("guest_ai_record", Math.max(1, Math.ceil((Date.parse(permissions.expiresAt!) - Date.now()) / 1000)));
    }
  }
}
