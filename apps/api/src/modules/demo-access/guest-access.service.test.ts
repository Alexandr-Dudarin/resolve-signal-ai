import "reflect-metadata";
import type { ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { getApiEnv } from "../../app/env.js";
import type { DemoRequest } from "./demo-access.config.js";
import { GuestAccessService } from "./guest-access.service.js";
import type { GuestRepository } from "./guest.repository.js";

const config = getApiEnv({
  DATABASE_URL: "postgresql://test:unused@db.example/demo?sslmode=require&sslaccept=strict", NODE_ENV: "production",
  CORS_ORIGIN: "https://demo.example", DEMO_ACCESS_MODE: "guest", OPENAI_API_KEY: "unused-test-key", OPENAI_MODEL: "unused-test-model",
  DEMO_SESSION_SECRET: "TestOnlySecret_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
});
function fixture() {
  const sessions = new Map<string, { expiresAt: Date }>();
  const repository = {
    findSession: vi.fn(async (key: string) => sessions.get(key) ?? null),
    createSession: vi.fn(async (key: string) => { const item = { expiresAt: new Date(Date.now() + 60000) }; sessions.set(key, item); return item; }),
    revokeSession: vi.fn(async (key: string) => { sessions.delete(key); }),
  } as unknown as GuestRepository;
  let header = "";
  const response = { setHeader: (_name: string, value: string) => { header = value; } } as unknown as ServerResponse;
  return { sessions, repository, response, cookie: () => header, service: new GuestAccessService(config, repository) };
}

describe("persistent guest session security", () => {
  it("issues an opaque production host-only Secure HttpOnly cookie and only stores a keyed verifier", async () => {
    const f = fixture();
    const status = await f.service.start({ headers: {} } as DemoRequest, f.response);
    const cookie = f.cookie();
    expect(cookie).toMatch(/^__Host-resolve_guest=[A-Za-z0-9_-]{43};/);
    expect(cookie).toContain("Path=/; HttpOnly; SameSite=Lax;"); expect(cookie).toContain("; Secure");
    expect(cookie).not.toContain("Domain=");
    const key = [...f.sessions.keys()][0]!;
    expect(key).toMatch(/^[a-f0-9]{64}$/); expect(cookie).not.toContain(key);
    expect(JSON.stringify(status)).not.toContain(key); expect(status.mode).toBe("guest");
    const request = { headers: { cookie: cookie.split(";")[0] } } as DemoRequest;
    const restarted = new GuestAccessService(config, f.repository);
    expect((await restarted.status(request)).authenticated).toBe(true);
    const rotated = new GuestAccessService({ ...config, DEMO_SESSION_SECRET: config.DEMO_SESSION_SECRET + "_rotated" }, f.repository);
    expect((await rotated.status(request)).authenticated).toBe(false);
    await restarted.logout(request, f.response);
    expect((await f.service.status(request)).authenticated).toBe(false);
    expect(f.cookie()).toContain("Max-Age=0");
  });
  it("does not trust cookie lookalikes, duplicates, payload/URL identifiers or database failure", async () => {
    const f = fixture();
    for (const cookie of ["", "__Host-resolve_guest=not-a-token", `__Host-resolve_guest=${"a".repeat(43)}; __Host-resolve_guest=${"b".repeat(43)}`, `resolve_guest=${"a".repeat(43)}`]) {
      expect(await f.service.resolve({ headers: { cookie } } as DemoRequest)).toBeNull();
    }
    expect(f.repository.findSession).not.toHaveBeenCalled();
    vi.mocked(f.repository.findSession).mockRejectedValueOnce(new Error("database unavailable"));
    await expect(f.service.resolve({ headers: { cookie: `__Host-resolve_guest=${"a".repeat(43)}` } } as DemoRequest)).rejects.toThrow();
  });
  it("does not issue a cookie when the durable session store is full", async () => {
    const f = fixture(); vi.mocked(f.repository.createSession).mockResolvedValueOnce(null);
    await expect(f.service.start({ headers: {} } as DemoRequest, f.response)).rejects.toMatchObject({ status: 429 });
    expect(f.cookie()).toBe("");
  });
});
