import "reflect-metadata";
import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppModule } from "../../app/app.module.js";
import { configureHttp } from "../../app/configure-http.js";
import { getApiEnv } from "../../app/env.js";
import { PrismaService } from "../../app/prisma.service.js";
import { FeedbackService } from "../feedback/application/feedback.service.js";
import { AiUsageLimitExceededError } from "../ai-usage/application/ai-usage-limiter.js";
import { DEMO_CONFIG } from "./demo-access.config.js";

const code = "TestOnlyCode_0123456789_abcdef";
const origin = "http://localhost:5173";
const id = "11111111-1111-4111-8111-111111111111";
const environment = getApiEnv({
  DATABASE_URL: "postgresql://test:test@localhost:5432/test", NODE_ENV: "test",
  DEMO_ACCESS_ENABLED: "true", DEMO_ACCESS_CODE: code,
  DEMO_SESSION_SECRET: "TestOnlySecret_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  DEMO_SESSION_TTL_SECONDS: "60", DEMO_LOGIN_PER_IP: "3", DEMO_WRITE_PER_IP_MINUTE: "3",
  DEMO_CREATE_GLOBAL_DAY: "2", CORS_ORIGIN: origin,
});
function cookieHeader(response: { headers: Record<string, unknown> }) {
  const values = response.headers["set-cookie"];
  if (!Array.isArray(values) || typeof values[0] !== "string") throw new Error("Expected Set-Cookie");
  return values[0];
}
const operations: ["get" | "post" | "patch", string][] = [
  ["get", "/api/v1/dashboard/summary"], ["get", "/api/v1/feedback"],
  ["get", `/api/v1/feedback/${id}`], ["get", "/api/v1/ai/runtime-status"],
  ["post", "/api/v1/feedback"], ["post", `/api/v1/feedback/${id}/analyze`],
  ["post", `/api/v1/feedback/${id}/replies`], ["patch", `/api/v1/feedback/${id}/status`],
  ["patch", `/api/v1/replies/${id}`],
];

describe("server-enforced shared demo gate (full AppModule)", () => {
  let app: NestExpressApplication;
  const service = {
    list: vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 }),
    get: vi.fn().mockResolvedValue({ id }), create: vi.fn().mockResolvedValue({ id }),
    analyze: vi.fn().mockResolvedValue({ id }), generateReplies: vi.fn().mockResolvedValue([]),
    updateStatus: vi.fn().mockResolvedValue({ id }), updateReply: vi.fn().mockResolvedValue({ id }),
  };
  const login = () => request(app.getHttpServer()).post("/api/v1/demo/session").set("Origin", origin).send({ code });
  const cookie = async () => cookieHeader(await login().expect(200)).split(";")[0]!;

  beforeEach(async () => {
    vi.stubEnv("DATABASE_URL", environment.DATABASE_URL);
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.clearAllMocks();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DEMO_CONFIG).useValue(environment)
      .overrideProvider(PrismaService).useValue({})
      .overrideProvider(FeedbackService).useValue(service).compile();
    app = module.createNestApplication<NestExpressApplication>({ bodyParser: false, logger: false });
    configureHttp(app, environment);
    await app.init();
  });
  afterEach(async () => { await app.close(); vi.useRealTimers(); vi.unstubAllEnvs(); });

  it.each(operations)("rejects unauthorized direct %s %s even with forged forwarding headers", async (method, path) => {
    await request(app.getHttpServer())[method](path).set("X-Forwarded-For", "203.0.113.9")
      .set("X-Forwarded-Host", "localhost:5173").set("Origin", origin).send({}).expect(401);
    for (const fn of Object.values(service)) expect(fn).not.toHaveBeenCalled();
  });

  it("allows only safe public health/session status; hides Swagger HTML and JSON", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);
    const status = await request(app.getHttpServer()).get("/api/v1/demo/session").expect(200);
    expect(status.body).toEqual({ enabled: true, authenticated: false, expiresAt: null });
    expect(status.headers["cache-control"]).toBe("no-store");
    for (const path of ["/api/docs", "/api/docs/", "/api/docs-json"]) await request(app.getHttpServer()).get(path).expect(404);
  });

  it("supports refresh/direct navigation and authenticated reads, creation and PATCH", async () => {
    const response = await login().expect(200);
    expect(cookieHeader(response)).toContain("HttpOnly; SameSite=Lax; Max-Age=60");
    const value = cookieHeader(response).split(";")[0]!;
    const refreshed = await request(app.getHttpServer()).get("/api/v1/demo/session").set("Cookie", value).expect(200);
    expect(refreshed.body.authenticated).toBe(true);
    await request(app.getHttpServer()).get(`/api/v1/feedback/${id}`).set("Cookie", value).expect(200);
    await request(app.getHttpServer()).post("/api/v1/feedback").set("Cookie", value).set("Origin", origin).send({ text: "Тестовое обращение" }).expect(201);
    await request(app.getHttpServer()).patch(`/api/v1/feedback/${id}/status`).set("Cookie", value).set("Origin", origin).send({ status: "resolved" }).expect(200);
    await request(app.getHttpServer()).patch(`/api/v1/replies/${id}`).set("Cookie", value).set("Origin", origin).send({ status: "approved" }).expect(200);
    expect(service.updateStatus).toHaveBeenCalledWith(id, "resolved");
    expect(service.updateReply).toHaveBeenCalledWith(id, { status: "approved" });
    expect(JSON.stringify(refreshed.body)).not.toContain(code);
  });

  it("revokes server session on logout; replaying the old cookie fails", async () => {
    const value = await cookie();
    const logout = await request(app.getHttpServer()).post("/api/v1/demo/session/logout").set("Cookie", value).set("Origin", origin).send({}).expect(200);
    expect(cookieHeader(logout)).toContain("Max-Age=0");
    await request(app.getHttpServer()).get("/api/v1/feedback").set("Cookie", value).expect(401);
  });

  it("rejects tampered, duplicate, malformed and expired cookies", async () => {
    const value = await cookie();
    for (const invalid of ["resolve_demo=garbage", `${value.slice(0, -1)}!`, `${value}; ${value}`, value.replace(/\.\d{13}\./, ".9999999999999.")]) {
      await request(app.getHttpServer()).get("/api/v1/feedback").set("Cookie", invalid).expect(401);
    }
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(Date.now() + 61000);
    await request(app.getHttpServer()).get("/api/v1/feedback").set("Cookie", value).expect(401);
  });

  it("rejects unsafe requests without exact Origin and JSON, including session endpoints", async () => {
    const value = await cookie();
    for (const path of ["/api/v1/demo/session", "/api/v1/demo/session/logout", "/api/v1/feedback"]) {
      await request(app.getHttpServer()).post(path).set("Cookie", value).send({ code }).expect(403);
      await request(app.getHttpServer()).post(path).set("Cookie", value).set("Origin", "https://evil.example").send({ code }).expect(403);
      await request(app.getHttpServer()).post(path).set("Cookie", value).set("Origin", origin).type("form").send({ code }).expect(415);
    }
    expect(service.create).not.toHaveBeenCalled();
  });

  it("limits wrong and malformed login attempts despite rotating spoofed XFF", async () => {
    for (let i = 0; i < 3; i++) {
      await request(app.getHttpServer()).post("/api/v1/demo/session").set("Origin", origin).set("X-Forwarded-For", `203.0.113.${i}`)
        .send(i === 0 ? { code: 42 } : { code: "wrong" }).expect(401);
    }
    const blocked = await login().expect(429);
    expect(blocked.body).toMatchObject({ code: "DEMO_RATE_LIMIT_EXCEEDED", scope: "login_ip" });
    expect(blocked.headers["retry-after"]).toBe(String(blocked.body.retryAfterSeconds));
  });

  it("caps mutation spam and global daily creation before service calls", async () => {
    const value = await cookie();
    const create = () => request(app.getHttpServer()).post("/api/v1/feedback").set("Cookie", value).set("Origin", origin).send({ text: "Тестовое обращение" });
    await create().expect(201); await create().expect(201);
    expect((await create().expect(429)).body.scope).toBe("create_global");
    const patch = () => request(app.getHttpServer()).patch(`/api/v1/feedback/${id}/status`).set("Cookie", value).set("Origin", origin).send({ status: "resolved" });
    await patch().expect(200);
    expect((await patch().expect(429)).body.scope).toBe("write_ip");
    expect(service.create).toHaveBeenCalledTimes(2);
    expect(service.updateStatus).toHaveBeenCalledTimes(1);
  });

  it("preserves the PostgreSQL AI quota 429 contract behind the gate", async () => {
    const value = await cookie();
    service.analyze.mockRejectedValueOnce(new AiUsageLimitExceededError("global_day", 123));
    const result = await request(app.getHttpServer()).post(`/api/v1/feedback/${id}/analyze`)
      .set("Cookie", value).set("Origin", origin).send({}).expect(429);
    expect(result.body).toEqual({ code: "AI_USAGE_LIMIT_EXCEEDED", scope: "global_day", retryAfterSeconds: 123 });
    expect(result.headers["retry-after"]).toBe("123");
  });

  it("caps body size and redacts unexpected errors", async () => {
    const value = await cookie();
    await request(app.getHttpServer()).post("/api/v1/feedback").set("Cookie", value).set("Origin", origin).send({ text: "a".repeat(33000) }).expect(413);
    service.list.mockRejectedValueOnce(new Error("secret-db-url-and-provider-key"));
    const result = await request(app.getHttpServer()).get("/api/v1/feedback").set("Cookie", value).expect(500);
    expect(result.text).not.toContain("secret");
    expect(result.body.message).toBe("Не удалось выполнить запрос. Попробуйте позже.");
  });
});
