import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterEach, describe, expect, it } from "vitest";

import { getApiEnv } from "../../../app/env.js";
import {
  AI_RUNTIME_STATUS,
  createAiRuntimeStatus,
} from "../application/ai-runtime-status.js";
import { AiRuntimeController } from "./ai-runtime.controller.js";

const baseEnv = {
  DATABASE_URL:
    "postgresql://resolve_signal:resolve_signal@localhost:5434/resolve_signal?schema=public",
  PORT: "4000",
  CORS_ORIGIN: "http://localhost:5173",
};

describe("AI runtime status", () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  it("reports deterministic demo mode without credentials", () => {
    const status = createAiRuntimeStatus(getApiEnv(baseEnv));

    expect(status).toEqual({
      provider: "mock",
      model: "resolve-mock-v1",
      mode: "demo",
    });
  });

  it("reports the configured OpenAI model without exposing its API key", async () => {
    const secret = "secret-that-must-not-leave-the-server";
    const status = createAiRuntimeStatus(
      getApiEnv({
        ...baseEnv,
        AI_PROVIDER: "openai",
        OPENAI_API_KEY: secret,
        OPENAI_MODEL: "gpt-5.6-luna",
      }),
    );

    const moduleRef = await Test.createTestingModule({
      controllers: [AiRuntimeController],
      providers: [
        {
          provide: AI_RUNTIME_STATUS,
          useValue: status,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    const response = await request(app.getHttpServer())
      .get("/api/v1/ai/runtime-status")
      .expect(200);

    expect(response.body).toEqual({
      provider: "openai",
      model: "gpt-5.6-luna",
      mode: "live",
    });
    expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(response.body).not.toHaveProperty("apiKey");
  });
});
