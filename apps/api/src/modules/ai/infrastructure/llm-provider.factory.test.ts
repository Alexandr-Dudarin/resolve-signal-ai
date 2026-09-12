import { describe, expect, it } from "vitest";

import { getApiEnv } from "../../../app/env.js";
import { MockProvider } from "./mock.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { createLlmProvider } from "./llm-provider.factory.js";

const baseEnv = {
  DATABASE_URL:
    "postgresql://resolve_signal:resolve_signal@localhost:5434/resolve_signal?schema=public",
  PORT: "4000",
  CORS_ORIGIN: "http://localhost:5173",
};

describe("LLM provider factory", () => {
  it("creates MockProvider for mock mode", () => {
    const env = getApiEnv({
      ...baseEnv,
      AI_PROVIDER: "mock",
    });

    expect(createLlmProvider(env)).toBeInstanceOf(MockProvider);
  });

  it("creates OpenAIProvider for openai mode", () => {
    const env = getApiEnv({
      ...baseEnv,
      AI_PROVIDER: "openai",
      OPENAI_API_KEY: "test-key",
      OPENAI_MODEL: "test-model",
    });

    expect(createLlmProvider(env)).toBeInstanceOf(OpenAIProvider);
  });
});