import { describe, expect, it } from "vitest";

import { getApiEnv } from "./env.js";

const baseEnv = {
  DATABASE_URL:
    "postgresql://resolve_signal:resolve_signal@localhost:5434/resolve_signal?schema=public",
  PORT: "4000",
  CORS_ORIGIN: "http://localhost:5173",
};

describe("API environment", () => {
  it("uses mock provider without OpenAI credentials", () => {
    const env = getApiEnv(baseEnv);

    expect(env.AI_PROVIDER).toBe("mock");
    expect(env.OPENAI_API_KEY).toBeUndefined();
    expect(env.OPENAI_MODEL).toBeUndefined();
    expect(env.AI_USAGE_LIMITS_ENABLED).toBe(true);
    expect(env.AI_LIMIT_PER_IP_MINUTE).toBe(5);
    expect(env.AI_LIMIT_PER_IP_DAY).toBe(20);
    expect(env.AI_LIMIT_GLOBAL_DAY).toBe(100);
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it("rejects openai provider without credentials", () => {
    expect(() =>
      getApiEnv({
        ...baseEnv,
        AI_PROVIDER: "openai",
      }),
    ).toThrow(/OPENAI_API_KEY/);
  });

  it("accepts openai provider with API key and model", () => {
    const env = getApiEnv({
      ...baseEnv,
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "test-model",
    });

    expect(env.AI_PROVIDER).toBe("openai");
    expect(env.OPENAI_API_KEY).toBe("test-key");
    expect(env.OPENAI_MODEL).toBe("test-model");
  });

  it("parses custom limits, disabled mode, and proxy hops", () => {
    const env = getApiEnv({
      ...baseEnv,
      AI_USAGE_LIMITS_ENABLED: "false",
      AI_LIMIT_PER_IP_MINUTE: "7",
      AI_LIMIT_PER_IP_DAY: "30",
      AI_LIMIT_GLOBAL_DAY: "150",
      TRUST_PROXY_HOPS: "1",
    });

    expect(env.AI_USAGE_LIMITS_ENABLED).toBe(false);
    expect(env.AI_LIMIT_PER_IP_MINUTE).toBe(7);
    expect(env.AI_LIMIT_PER_IP_DAY).toBe(30);
    expect(env.AI_LIMIT_GLOBAL_DAY).toBe(150);
    expect(env.TRUST_PROXY_HOPS).toBe(1);
  });

  it("does not coerce the string false to true", () => {
    expect(
      getApiEnv({
        ...baseEnv,
        AI_USAGE_LIMITS_ENABLED: "false",
      }).AI_USAGE_LIMITS_ENABLED,
    ).toBe(false);
  });

  it("rejects invalid limits and proxy hops", () => {
    expect(() =>
      getApiEnv({
        ...baseEnv,
        AI_LIMIT_PER_IP_MINUTE: "0",
      }),
    ).toThrow(/AI_LIMIT_PER_IP_MINUTE/);

    expect(() =>
      getApiEnv({
        ...baseEnv,
        TRUST_PROXY_HOPS: "-1",
      }),
    ).toThrow(/TRUST_PROXY_HOPS/);

    expect(() =>
      getApiEnv({
        ...baseEnv,
        AI_USAGE_LIMITS_ENABLED: "yes",
      }),
    ).toThrow(/AI_USAGE_LIMITS_ENABLED/);
  });

  it.each(["AI_LIMIT_PER_IP_MINUTE", "AI_LIMIT_PER_IP_DAY", "AI_LIMIT_GLOBAL_DAY"])("rejects non-positive and non-integer %s", (name) => {
    for (const value of ["0", "-1", "1.5", "abc"]) {
      expect(() => getApiEnv({ ...baseEnv, [name]: value })).toThrow(name);
    }
  });
});

const production = {
  ...baseEnv, NODE_ENV: "production", CORS_ORIGIN: "https://demo.example",
  DATABASE_URL: "postgresql://user:password@db.example/demo?sslmode=require&sslaccept=strict",
  OPENAI_API_KEY: "test-key", OPENAI_MODEL: "test-model",
  DEMO_ACCESS_CODE: "TestOnlyCode_0123456789_abcdef",
  DEMO_SESSION_SECRET: "TestOnlySecret_0123456789_ABCDEFGHIJKLMNOPQRSTUVWXYZ",
};

describe("production fails closed", () => {
  it("defaults to gated live OpenAI with bounded sessions", () => {
    const config = getApiEnv(production);
    expect(config.DEMO_ACCESS_ENABLED).toBe(true);
    expect(config.AI_PROVIDER).toBe("openai");
    expect(config.DEMO_SESSION_TTL_SECONDS).toBe(43200);
  });
  it.each([
    ["DEMO_ACCESS_ENABLED", "false"], ["DEMO_ACCESS_CODE", "short"], ["DEMO_SESSION_SECRET", "x".repeat(64)],
    ["DEMO_ACCESS_CODE", ""], ["DEMO_SESSION_SECRET", ""], ["AI_PROVIDER", "mock"],
    ["AI_USAGE_LIMITS_ENABLED", "false"], ["CORS_ORIGIN", "http://demo.example"],
    ["CORS_ORIGIN", "https://demo.example/path"], ["CORS_ORIGIN", "not a URL"],
    ["DATABASE_URL", "postgresql://user:password@db.example/demo"],
    ["DATABASE_URL", "postgresql://user:password@db.example/demo?sslmode=require&sslaccept=accept_invalid_certs"],
    ["DATABASE_URL", production.DATABASE_URL + "&sslmode=disable"],
    ["DATABASE_URL", production.DATABASE_URL + "&host=other"],
    ["OPENAI_MODEL", ""], ["OPENAI_API_KEY", ""], ["DEMO_SESSION_TTL_SECONDS", "999999"],
  ])("rejects unsafe %s without leaking secret values", (key, value) => {
    expect(() => getApiEnv({ ...production, [key]: value })).toThrow();
    try { getApiEnv({ ...production, [key]: value }); } catch (error) {
      expect(String(error)).not.toContain(production.DEMO_SESSION_SECRET);
      expect(String(error)).not.toContain("user:password");
    }
  });
  it("rejects reused access/signing secrets", () => {
    expect(() => getApiEnv({ ...production, DEMO_ACCESS_CODE: production.DEMO_SESSION_SECRET })).toThrow("DEMO_SESSION_SECRET");
  });
});
