import { describe, expect, it, vi } from "vitest";
import type { ServerResponse } from "node:http";
import { getApiEnv } from "../../app/env.js";
import type { DemoRequest } from "./demo-access.config.js";
import { DemoSessionService } from "./demo-session.service.js";
const config = getApiEnv({
  DATABASE_URL: "postgresql://u:p@db.example/demo?sslmode=require&sslaccept=strict", NODE_ENV: "production",
  CORS_ORIGIN: "https://demo.example", OPENAI_MODEL: "test", OPENAI_API_KEY: "test-only",
  DEMO_ACCESS_CODE: "TestOnlyCode_0123456789_abcdef",
  DEMO_SESSION_SECRET: "TestOnlySecret_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
});
it("issues host-only Secure/HttpOnly production cookies and loses sessions on restart", () => {
  const service = new DemoSessionService(config);
  const setHeader = vi.fn();
  const empty = { headers: {} } as DemoRequest;
  service.login(config.DEMO_ACCESS_CODE!, empty, { setHeader } as unknown as ServerResponse);
  const cookie = setHeader.mock.calls[0]![1] as string;
  expect(cookie).toMatch(/^__Host-resolve_demo=/);
  expect(cookie).toContain("; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200; Secure");
  expect(cookie).not.toContain("Domain=");
  expect(cookie).not.toContain(config.DEMO_ACCESS_CODE);
  const request = { headers: { cookie: cookie.split(";")[0] } } as DemoRequest;
  expect(service.status(request).authenticated).toBe(true);
  expect(new DemoSessionService(config).status(request).authenticated).toBe(false);
});
describe("development workflow", () => {
  it("explicit ungated development needs no code or session cookie", () => {
    const service = new DemoSessionService(getApiEnv({ DATABASE_URL: "postgresql://localhost/test" }));
    expect(service.status({ headers: {} } as DemoRequest)).toEqual({ enabled: false, authenticated: true, expiresAt: null });
  });
});
