import { describe, expect, it } from "vitest";
import { getApiEnv } from "../../app/env.js";
import { DemoRateLimiter } from "./demo-rate-limiter.js";
const config = getApiEnv({ DATABASE_URL: "postgresql://localhost/test", DEMO_LOGIN_GLOBAL: "2", DEMO_WRITE_GLOBAL_MINUTE: "2", DEMO_CREATE_GLOBAL_DAY: "1" });

describe("bounded single-instance demo limiter", () => {
  it("blocks global login attempts across IPs and resets at the UTC window", () => {
    const limiter = new DemoRateLimiter(config);
    limiter.reserve("login", "a", false, 1000);
    limiter.reserve("login", "b", false, 1000);
    expect(() => limiter.reserve("login", "c", false, 1000)).toThrow();
    expect(() => limiter.reserve("login", "c", false, 900000)).not.toThrow();
  });
  it("preserves the daily creation cap across minute resets without charging blocked writes", () => {
    const limiter = new DemoRateLimiter(config);
    limiter.reserve("write", "a", true, 1000);
    expect(() => limiter.reserve("write", "b", true, 61000)).toThrow();
    limiter.reserve("write", "b", false, 61000);
    limiter.reserve("write", "c", false, 61000);
    expect(() => limiter.reserve("write", "d", false, 61000)).toThrow();
    expect(() => limiter.reserve("write", "a", true, 86400000)).not.toThrow();
  });
});
