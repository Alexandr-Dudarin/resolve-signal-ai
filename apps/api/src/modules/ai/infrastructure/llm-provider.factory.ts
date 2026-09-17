import type { ApiEnv } from "../../../app/env.js";
import { MockProvider } from "./mock.provider.js";
import { OpenAIProvider } from "./openai.provider.js";

import type { LLMProvider } from "../ports/llm-provider.js";

export function createLlmProvider(env: ApiEnv): LLMProvider {
  if (env.AI_PROVIDER === "mock") {
    return new MockProvider();
  }

  if (!env.OPENAI_API_KEY || !env.OPENAI_MODEL) {
    throw new Error(
      "OpenAI configuration is incomplete for AI_PROVIDER=openai",
    );
  }

  return new OpenAIProvider(env.OPENAI_API_KEY, env.OPENAI_MODEL);
}