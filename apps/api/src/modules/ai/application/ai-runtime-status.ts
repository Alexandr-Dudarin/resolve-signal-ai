import {
  AiRuntimeStatusSchema,
  type AiRuntimeStatus,
} from "@resolve-signal/contracts";

import type { ApiEnv } from "../../../app/env.js";

export const AI_RUNTIME_STATUS = Symbol("AI_RUNTIME_STATUS");

export function createAiRuntimeStatus(env: ApiEnv): AiRuntimeStatus {
  if (env.AI_PROVIDER === "openai") {
    if (!env.OPENAI_MODEL) {
      throw new Error("OpenAI model is missing from validated environment");
    }

    return AiRuntimeStatusSchema.parse({
      provider: "openai",
      model: env.OPENAI_MODEL,
      mode: "live",
    });
  }

  return AiRuntimeStatusSchema.parse({
    provider: "mock",
    model: "resolve-mock-v1",
    mode: "demo",
  });
}
