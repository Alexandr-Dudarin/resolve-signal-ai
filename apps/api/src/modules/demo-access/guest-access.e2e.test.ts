import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { Test } from "@nestjs/testing";
import { Controller, Get, Post } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateFeedbackInput, FeedbackDetails, SuggestedReply } from "@resolve-signal/contracts";
import { AppModule } from "../../app/app.module.js";
import { configureHttp } from "../../app/configure-http.js";
import { getApiEnv, type ApiEnv } from "../../app/env.js";
import { PrismaService } from "../../app/prisma.service.js";
import { MockProvider } from "../ai/infrastructure/mock.provider.js";
import { LLM_PROVIDER, type GeneratedRepliesResult } from "../ai/ports/llm-provider.js";
import { AiUsageLimiter, AiUsageLimitExceededError } from "../ai-usage/application/ai-usage-limiter.js";
import { FEEDBACK_REPOSITORY, type FeedbackRepository } from "../feedback/domain/feedback.repository.js";
import { DEMO_CONFIG } from "./demo-access.config.js";
import { GUEST_REPOSITORY, type GuestRepository, type GuestOwnership } from "./guest.repository.js";

const origin = "http://localhost:5173";
const examples = Array.from({ length: 5 }, (_, n) => `90000000-0000-4000-8000-${String(n + 1).padStart(12, "0")}`);
const env = getApiEnv({
  DATABASE_URL: "postgresql://test:test@localhost:5432/test", NODE_ENV: "test",
  DEMO_ACCESS_ENABLED: "true", DEMO_ACCESS_MODE: "guest", CORS_ORIGIN: origin,
  DEMO_SESSION_SECRET: "TestOnlySecret_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
});
function record(input: Partial<CreateFeedbackInput> = {}, id: string = randomUUID()): FeedbackDetails {
  return {
    id, source: "manual", text: "Демо: доставка задержалась.", status: "new", rating: null,
    authorName: null, customerRef: null, externalId: null, latestAnalysis: null,
    suggestedReplies: [], currentReplyGeneration: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...input,
  };
}

@Controller("api/v1/private-probe")
class PrivateProbeController {
  @Get() read() { return { internal: true }; }
  @Post() write() { return { internal: true }; }
}

describe("passwordless guest HTTP boundary (real guard and application services)", () => {
  let app: NestExpressApplication;
  let items: Map<string, FeedbackDetails>;
  let ownership: Map<string, GuestOwnership>;
  let sessions: Map<string, { expiresAt: Date }>;
  let guestRepository: GuestRepository;
  let repository: FeedbackRepository;
  let provider: MockProvider;
  const reserve = vi.fn();

  async function bootstrap(config: ApiEnv = env) {
    vi.stubEnv("DATABASE_URL", env.DATABASE_URL);
    vi.stubEnv("AI_PROVIDER", "mock");
    const module = await Test.createTestingModule({ imports: [AppModule], controllers: [PrivateProbeController] })
      .overrideProvider(DEMO_CONFIG).useValue(config)
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(GUEST_REPOSITORY).useValue(guestRepository)
      .overrideProvider(FEEDBACK_REPOSITORY).useValue(repository)
      .overrideProvider(LLM_PROVIDER).useValue(provider)
      .overrideProvider(AiUsageLimiter).useValue({ reserve }).compile();
    app = module.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
    configureHttp(app, config);
    await app.init();
  }
  const http = () => request(app.getHttpServer());
  const mutate = (method: "post" | "patch", path: string, cookie: string) => http()[method](path).set("Origin", origin).set("Cookie", cookie);
  async function start() {
    const response = await http().post("/api/v1/demo/session/guest").set("Origin", origin).send({}).expect(200);
    return (response.headers["set-cookie"] as unknown as string[])[0]!.split(";")[0]!;
  }
  async function create(cookie: string, input = { text: "Доставка тестового заказа задержалась." }) {
    return (await mutate("post", "/api/v1/feedback", cookie).send(input).expect(201)).body as FeedbackDetails;
  }

  beforeEach(async () => {
    reserve.mockReset().mockResolvedValue(undefined);
    items = new Map(examples.map((id) => [id, record({}, id)]));
    ownership = new Map(examples.map((id) => [id, { guestOwnerKey: null, guestExpiresAt: null }]));
    sessions = new Map();
    guestRepository = {
      findSession: vi.fn(async (key) => {
        const session = sessions.get(key);
        return session && session.expiresAt.getTime() > Date.now() ? session : null;
      }),
      createSession: vi.fn(async (key, ttl) => {
        const session = { expiresAt: new Date(Date.now() + ttl * 1000) };
        sessions.set(key, session); return session;
      }),
      revokeSession: vi.fn(async (key) => { sessions.delete(key); }),
      createFeedback: vi.fn(async (input, key) => {
        const item = record(input); items.set(item.id, item);
        ownership.set(item.id, { guestOwnerKey: key, guestExpiresAt: new Date(Date.now() + 86400000) });
        return { id: item.id };
      }),
      ownership: vi.fn(async (id) => ownership.get(id) ?? null),
      replyFeedbackId: vi.fn(async (id) => [...items.values()].find((x) => x.suggestedReplies.some((r) => r.id === id))?.id ?? null),
      reserveAiOperation: vi.fn().mockResolvedValue(true),
    };
    repository = {
      create: vi.fn(async (input) => record(input)),
      list: vi.fn(async (query) => ({ items: [...items.values()], total: items.size, page: query.page, pageSize: query.pageSize })),
      allForDashboard: vi.fn(async () => ({ items: [...items.values()], total: items.size, page: 1, pageSize: 20 })),
      findById: vi.fn(async (id) => items.get(id) ?? null),
      saveAnalysis: vi.fn(async (id, result) => {
        const { metadata, ...analysis } = result;
        const saved = { ...analysis, ...metadata, id: randomUUID(), feedbackId: id, createdAt: new Date().toISOString() };
        items.get(id)!.latestAnalysis = saved; return saved;
      }),
      saveReplies: vi.fn(async (id, analysisId, result: GeneratedRepliesResult) => {
        const rows: SuggestedReply[] = result.replies.map((reply) => ({
          ...reply, id: randomUUID(), feedbackId: id, analysisId, generationId: null, originalText: reply.text,
          status: "draft", editedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }));
        items.get(id)!.suggestedReplies = rows; return rows;
      }),
      updateStatus: vi.fn(async (id, status) => { const item = items.get(id); if (item) item.status = status; return item ?? null; }),
      updateReply: vi.fn(async (id, input) => {
        const reply = [...items.values()].flatMap((x) => x.suggestedReplies).find((r) => r.id === id);
        if (reply) Object.assign(reply, input); return reply ?? null;
      }),
    };
    provider = new MockProvider();
    vi.spyOn(provider, "analyzeFeedback"); vi.spyOn(provider, "generateReplies");
    await bootstrap();
  });
  afterEach(async () => { await app.close(); vi.unstubAllEnvs(); vi.useRealTimers(); });

  it("allows anonymous Dashboard/list/details/runtime directly on the API without creating sessions", async () => {
    for (const path of ["/api/v1/dashboard/summary", "/api/v1/feedback", `/api/v1/feedback/${examples[0]}`, "/api/v1/ai/runtime-status"]) {
      const response = await http().get(path).expect(200);
      expect(response.headers["cache-control"]).toBe("no-store");
      expect(response.headers["set-cookie"]).toBeUndefined();
    }
    expect((await http().get(`/api/v1/feedback/${examples[0]}`)).body.permissions).toEqual({ canModify: false, reason: "shared_example", expiresAt: null });
    expect((await http().get("/api/v1/demo/session")).body).toEqual({ mode: "guest", enabled: true, authenticated: false, expiresAt: null });
    expect(guestRepository.createSession).not.toHaveBeenCalled();
    await http().get("/api/docs-json").expect(404);
  });

  it("requires a guest cookie for direct Render-style writes despite forged proxy/owner headers", async () => {
    for (const path of ["/api/v1/feedback", `/api/v1/feedback/${examples[0]}/analyze`, `/api/v1/feedback/${examples[0]}/replies`]) {
      await http().post(path).set("Origin", origin).set("X-Forwarded-For", "203.0.113.99")
        .set("X-Guest-Owner", "attacker").send({ text: "Тестовое обращение" }).expect(401);
    }
    await http().patch(`/api/v1/feedback/${examples[0]}/status`).set("Origin", origin).send({ status: "resolved" }).expect(401);
    expect(repository.create).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
  });

  it("issues an HttpOnly cookie, reuses it on refresh, hides the verifier and ignores mass-assignment", async () => {
    const response = await http().post("/api/v1/demo/session/guest").set("Origin", origin).send({}).expect(200);
    const header = (response.headers["set-cookie"] as unknown as string[])[0]!;
    expect(header).toContain("HttpOnly; SameSite=Lax"); expect(header).not.toContain("Domain=");
    const cookie = header.split(";")[0]!;
    expect((await http().get("/api/v1/demo/session").set("Cookie", cookie)).body.authenticated).toBe(true);
    await mutate("post", "/api/v1/demo/session/guest", cookie).send({}).expect(200);
    expect(guestRepository.createSession).toHaveBeenCalledTimes(1);
    const response2 = await mutate("post", "/api/v1/feedback", cookie).send({
      text: "Моё тестовое обращение", id: examples[0], guestOwnerKey: "forged", guestExpiresAt: "2099-01-01", guestAiOperations: -10,
    }).expect(201);
    expect(response2.body.id).not.toBe(examples[0]);
    expect(response2.body.permissions.canModify).toBe(true);
    const serialized = JSON.stringify(response2.body);
    expect(serialized).not.toContain("guestOwnerKey");
    expect(serialized).not.toContain([...sessions.keys()][0]);
    expect([...sessions.keys()][0]).toMatch(/^[a-f0-9]{64}$/);
    expect([...sessions.keys()][0]).not.toBe(cookie.split("=")[1]);
  });

  it("protects all five examples from status, analysis and reply generation before quota/provider calls", async () => {
    const cookie = await start();
    const before = JSON.stringify([...items]);
    for (const id of examples) {
      for (const action of ["analyze", "replies"]) {
        expect((await mutate("post", `/api/v1/feedback/${id}/${action}`, cookie).send({}).expect(403)).body).toEqual({ code: "DEMO_READ_ONLY" });
      }
      await mutate("patch", `/api/v1/feedback/${id}/status`, cookie).send({ status: "resolved" }).expect(403);
    }
    expect(JSON.stringify([...items])).toBe(before);
    expect(provider.analyzeFeedback).not.toHaveBeenCalled(); expect(provider.generateReplies).not.toHaveBeenCalled();
    expect(reserve).not.toHaveBeenCalled();
  });

  it("supports the owner's complete create/analyze/generate/edit/approve/reject/status workflow", async () => {
    const cookie = await start(); const item = await create(cookie);
    await mutate("post", `/api/v1/feedback/${item.id}/analyze`, cookie).send({}).expect(201);
    const generated = await mutate("post", `/api/v1/feedback/${item.id}/replies`, cookie).send({ tones: ["empathetic"] }).expect(201);
    const reply = generated.body[0] as SuggestedReply;
    await mutate("patch", `/api/v1/replies/${reply.id}`, cookie).send({ text: "Спасибо за обращение, уточним доставку." }).expect(200);
    for (const status of ["approved", "rejected"]) await mutate("patch", `/api/v1/replies/${reply.id}`, cookie).send({ status }).expect(200);
    const changed = await mutate("patch", `/api/v1/feedback/${item.id}/status`, cookie).send({ status: "resolved" }).expect(200);
    expect(changed.body.permissions.canModify).toBe(true); expect(changed.body.status).toBe("resolved");
    expect(items.get(item.id)!.suggestedReplies[0]!.status).toBe("rejected");
    expect(reserve).toHaveBeenCalledTimes(2);
  });

  it("resolves reply ownership through its actual parent and blocks every other-guest mutation", async () => {
    const alice = await start(); const item = await create(alice);
    const generated = await mutate("post", `/api/v1/feedback/${item.id}/replies`, alice).send({}).expect(201);
    const replyId = generated.body[0].id as string;
    const bob = await start(); reserve.mockClear(); vi.mocked(provider.analyzeFeedback).mockClear(); vi.mocked(provider.generateReplies).mockClear();
    const before = JSON.stringify(items.get(item.id));
    const view = await http().get(`/api/v1/feedback/${item.id}`).set("Cookie", bob).expect(200);
    expect(view.body.permissions.reason).toBe("other_guest");
    for (const action of ["analyze", "replies"]) await mutate("post", `/api/v1/feedback/${item.id}/${action}`, bob).send({}).expect(403);
    await mutate("patch", `/api/v1/feedback/${item.id}/status`, bob).send({ status: "resolved" }).expect(403);
    await mutate("patch", `/api/v1/replies/${replyId}`, bob).send({ status: "approved", feedbackId: examples[0] }).expect(403);
    await mutate("patch", `/api/v1/replies/${replyId}`, bob).send({ text: "Чужое изменение" }).expect(403);
    expect(JSON.stringify(items.get(item.id))).toBe(before); expect(reserve).not.toHaveBeenCalled();
    expect(provider.generateReplies).not.toHaveBeenCalled(); expect(provider.analyzeFeedback).not.toHaveBeenCalled();
  });

  it("retains CSRF, JSON, body, malformed JSON and UUID validation", async () => {
    const cookie = await start();
    for (const path of ["/api/v1/demo/session/guest", "/api/v1/demo/session/logout", "/api/v1/feedback"]) {
      await http().post(path).set("Cookie", cookie).send({}).expect(403);
      await http().post(path).set("Cookie", cookie).set("Origin", "https://evil.example").send({}).expect(403);
      await mutate("post", path, cookie).type("form").send({ text: "Тестовое обращение" }).expect(415);
    }
    await mutate("post", "/api/v1/feedback", cookie).send({ text: "x".repeat(33000) }).expect(413);
    await mutate("post", "/api/v1/feedback", cookie).set("Content-Type", "application/json").send('{"broken":').expect(400);
    await mutate("post", "/api/v1/feedback/not-an-id/analyze", cookie).send({}).expect(400);
    expect(guestRepository.createFeedback).not.toHaveBeenCalled(); expect(reserve).not.toHaveBeenCalled();
  });

  it("normalizes guest XSS input to text and preserves existing AI quota 429 before provider calls", async () => {
    const cookie = await start();
    const item = await create(cookie, { text: '<b>Доставка задержалась.</b><img src=x onerror=alert(1)><script>alert(1)</script>' });
    expect(item.text).toBe("Доставка задержалась.");
    reserve.mockRejectedValueOnce(new AiUsageLimitExceededError("global_day", 123));
    const limited = await mutate("post", `/api/v1/feedback/${item.id}/analyze`, cookie).send({}).expect(429);
    expect(limited.body).toEqual({ code: "AI_USAGE_LIMIT_EXCEEDED", scope: "global_day", retryAfterSeconds: 123 });
    expect(limited.headers["retry-after"]).toBe("123"); expect(provider.analyzeFeedback).not.toHaveBeenCalled();
  });

  it("returns typed storage and per-record AI limits without changing data or calling the provider", async () => {
    const cookie = await start(); const item = await create(cookie);
    vi.mocked(guestRepository.createFeedback).mockResolvedValueOnce({ scope: "guest_records", retryAfterSeconds: 600 });
    const full = await mutate("post", "/api/v1/feedback", cookie).send({ text: "Ещё одно обращение" }).expect(429);
    expect(full.headers["retry-after"]).toBe("600"); expect(full.body.scope).toBe("guest_records");
    vi.mocked(guestRepository.reserveAiOperation).mockResolvedValueOnce(false);
    const capped = await mutate("post", `/api/v1/feedback/${item.id}/analyze`, cookie).send({}).expect(429);
    expect(capped.body.scope).toBe("guest_ai_record"); expect(reserve).not.toHaveBeenCalled();
    expect(provider.analyzeFeedback).not.toHaveBeenCalled();
  });

  it("revokes guest cookies on logout; stale, duplicate and malformed tokens never grant write access", async () => {
    const cookie = await start(); const item = await create(cookie);
    for (const invalid of [`${cookie}; ${cookie}`, "resolve_guest=invalid", cookie.replace(/.$/, "!")]) {
      await mutate("patch", `/api/v1/feedback/${item.id}/status`, invalid).send({ status: "resolved" }).expect(401);
    }
    await mutate("post", "/api/v1/demo/session/logout", cookie).send({}).expect(200);
    await mutate("patch", `/api/v1/feedback/${item.id}/status`, cookie).send({ status: "resolved" }).expect(401);
    await http().get("/api/v1/feedback").expect(200);
    const other = await start();
    await mutate("patch", `/api/v1/feedback/${item.id}/status`, other).send({ status: "resolved" }).expect(403);
  });

  it("enforces session expiry and record expiry on the server", async () => {
    const cookie = await start(); const item = await create(cookie);
    ownership.get(item.id)!.guestExpiresAt = new Date(Date.now() - 1000);
    await mutate("post", `/api/v1/feedback/${item.id}/analyze`, cookie).send({}).expect(403);
    for (const session of sessions.values()) session.expiresAt = new Date(Date.now() - 1000);
    await mutate("post", "/api/v1/feedback", cookie).send({ text: "Новое обращение" }).expect(401);
    expect(reserve).not.toHaveBeenCalled();
  });

  it("rate limits anonymous reads and session creation despite spoofed XFF", async () => {
    await app.close(); await bootstrap({ ...env, DEMO_READ_PER_IP_MINUTE: 2, DEMO_GUEST_SESSION_PER_IP: 1 });
    for (let i = 0; i < 2; i++) await http().get("/api/v1/feedback").set("X-Forwarded-For", `203.0.113.${i}`).expect(200);
    const denied = await http().get("/api/v1/feedback").set("X-Forwarded-For", "198.51.100.5").expect(429);
    expect(denied.body.scope).toBe("read_ip"); expect(Number(denied.headers["retry-after"])).toBeGreaterThan(0);
    await app.close(); await bootstrap({ ...env, DEMO_GUEST_SESSION_PER_IP: 1 });
    await start();
    const sessionsLimit = await http().post("/api/v1/demo/session/guest").set("Origin", origin).set("X-Forwarded-For", "203.0.113.22").send({}).expect(429);
    expect(sessionsLimit.body.scope).toBe("guest_session_ip");
  });

  it("limits fabricated-cookie writes before database lookup, without relying on valid authentication", async () => {
    await app.close(); await bootstrap({ ...env, DEMO_READ_PER_IP_MINUTE: 2 });
    for (let i = 0; i < 2; i++) {
      await mutate("post", "/api/v1/feedback", `resolve_guest=${String(i).repeat(43)}`).send({ text: "Тестовый запрос" }).expect(401);
    }
    const lookupCount = vi.mocked(guestRepository.findSession).mock.calls.length;
    const blocked = await mutate("post", "/api/v1/feedback", `resolve_guest=${"x".repeat(43)}`).send({ text: "Тестовый запрос" }).expect(429);
    expect(blocked.body.scope).toBe("read_ip");
    expect(guestRepository.findSession).toHaveBeenCalledTimes(lookupCount);
    expect(guestRepository.createFeedback).not.toHaveBeenCalled();
  });

  it("keeps unannotated controllers closed even for a valid guest session", async () => {
    const cookie = await start();
    await http().get("/api/v1/private-probe").set("Cookie", cookie).expect(403);
    await mutate("post", "/api/v1/private-probe", cookie).send({}).expect(403);
  });

  it("fails closed on guest storage failure and disables code login while guest mode is active", async () => {
    await http().post("/api/v1/demo/session").set("Origin", origin).send({ code: "anything" }).expect(404);
    const cookie = await start();
    vi.mocked(guestRepository.findSession).mockRejectedValueOnce(new Error("secret database URL"));
    const failed = await mutate("post", "/api/v1/feedback", cookie).send({ text: "Новое обращение" }).expect(500);
    expect(failed.text).not.toContain("secret"); expect(guestRepository.createFeedback).not.toHaveBeenCalled();
  });
});
