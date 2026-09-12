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
});