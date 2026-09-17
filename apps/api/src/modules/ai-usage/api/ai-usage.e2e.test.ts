import "reflect-metadata";

import { Test } from "@nestjs/testing";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type {
  CreateFeedbackInput,
  FeedbackDetails,
  FeedbackListQuery,
  FeedbackStatus,
  SuggestedReply,
  UpdateReplyInput,
} from "@resolve-signal/contracts";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  AI_USAGE_CONFIG,
  AiUsageLimiter,
} from "../application/ai-usage-limiter.js";
import {
  AI_USAGE_REPOSITORY,
  type AiUsageCounterReservation,
  type AiUsageRepository,
  type AiUsageReservationResult,
} from "../domain/ai-usage.repository.js";
import { LLM_PROVIDER, type AnalysisResult, type LLMProvider } from "../../ai/ports/llm-provider.js";
import { FeedbackController } from "../../feedback/api/feedback.controller.js";
import { FeedbackService } from "../../feedback/application/feedback.service.js";
import {
  FEEDBACK_REPOSITORY,
  type FeedbackRepository,
} from "../../feedback/domain/feedback.repository.js";

const feedbackId = "11111111-1111-4111-8111-111111111111";

class MemoryUsageRepository implements AiUsageRepository {
  readonly subjectKeys: string[] = [];
  private readonly counts = new Map<string, number>();

  async reserve(
    counters: AiUsageCounterReservation[],
  ): Promise<AiUsageReservationResult> {
    this.subjectKeys.push(
      ...counters
        .filter((counter) => counter.scope !== "global_day")
        .map((counter) => counter.subjectKey),
    );

    for (const counter of counters) {
      const key = `${counter.scope}:${counter.subjectKey}:${counter.windowStart.toISOString()}`;
      if ((this.counts.get(key) ?? 0) >= counter.limit) {
        return { allowed: false, scope: counter.scope };
      }
    }

    for (const counter of counters) {
      const key = `${counter.scope}:${counter.subjectKey}:${counter.windowStart.toISOString()}`;
      this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    }

    return { allowed: true };
  }
}

class MemoryFeedbackRepository implements FeedbackRepository {
  readonly item: FeedbackDetails = {
    id: feedbackId,
    source: "manual",
    externalId: null,
    rating: 2,
    text: "Доставка задержалась.",
    authorName: "Анна",
    customerRef: null,
    status: "new",
    createdAt: "2026-09-17T12:00:00.000Z",
    updatedAt: "2026-09-17T12:00:00.000Z",
    latestAnalysis: null,
    currentReplyGeneration: null,
    suggestedReplies: [],
  };

  async create(input: CreateFeedbackInput) {
    void input;
    return this.item;
  }

  async list(query: FeedbackListQuery) {
    return { items: [this.item], total: 1, page: query.page, pageSize: query.pageSize };
  }

  async findById(id: string) {
    return id === feedbackId ? this.item : null;
  }

  async saveAnalysis(feedbackIdValue: string, result: AnalysisResult) {
    return {
      id: "22222222-2222-4222-8222-222222222222",
      feedbackId: feedbackIdValue,
      sentiment: result.sentiment,
      severity: result.severity,
      category: result.category,
      summary: result.summary,
      problems: result.problems,
      ...result.metadata,
      createdAt: "2026-09-17T12:00:01.000Z",
    };
  }

  async saveReplies() {
    return [];
  }

  async updateStatus(id: string, status: FeedbackStatus) {
    void id;
    void status;
    return this.item;
  }

  async updateReply(
    id: string,
    input: UpdateReplyInput,
  ): Promise<SuggestedReply | null> {
    void id;
    void input;
    return null;
  }

  async allForDashboard() {
    return { items: [this.item], total: 1, page: 1, pageSize: 1 };
  }
}

describe("AI usage HTTP contract and client identity", () => {
  let app: NestExpressApplication;
  const usageRepository = new MemoryUsageRepository();
  const analyzeFeedback = vi.fn().mockResolvedValue({
    sentiment: "negative",
    severity: "medium",
    category: "delivery",
    summary: "Клиент сообщает о задержке доставки.",
    problems: ["задержка доставки"],
    metadata: {
      provider: "openai",
      model: "test-model",
      promptVersion: "test-analysis-v1",
      inputTokens: 20,
      outputTokens: 10,
    },
  });

  beforeAll(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-17T12:34:18.000Z"));
    const provider: LLMProvider = {
      analyzeFeedback,
      generateReplies: vi.fn(),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [
        FeedbackService,
        AiUsageLimiter,
        { provide: FEEDBACK_REPOSITORY, useClass: MemoryFeedbackRepository },
        { provide: LLM_PROVIDER, useValue: provider },
        { provide: AI_USAGE_REPOSITORY, useValue: usageRepository },
        {
          provide: AI_USAGE_CONFIG,
          useValue: {
            enabled: true,
            provider: "openai",
            perIpMinute: 1,
            perIpDay: 20,
            globalDay: 100,
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication<NestExpressApplication>();
    app.set("trust proxy", 0);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    vi.useRealTimers();
  });

  it("returns structured 429 and ignores spoofed X-Forwarded-For when proxy trust is disabled", async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/feedback/${feedbackId}/analyze`)
      .set("X-Forwarded-For", "198.51.100.10")
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/feedback/${feedbackId}/analyze`)
      .set("X-Forwarded-For", "198.51.100.11")
      .expect(429);

    expect(response.body).toEqual({
      code: "AI_USAGE_LIMIT_EXCEEDED",
      scope: "ip_minute",
      retryAfterSeconds: 42,
    });
    expect(response.headers["retry-after"]).toBe(
      String(response.body.retryAfterSeconds),
    );
    expect(new Set(usageRepository.subjectKeys)).toEqual(
      new Set(["127.0.0.1"]),
    );
    expect(analyzeFeedback).toHaveBeenCalledTimes(1);
  });

  it("uses Express-resolved client identity with one trusted proxy hop", async () => {
    app.set("trust proxy", 1);
    usageRepository.subjectKeys.length = 0;
    try {
      await request(app.getHttpServer()).post(`/api/v1/feedback/${feedbackId}/analyze`)
        .set("X-Forwarded-For", "203.0.113.99, 198.51.100.44").expect(201);
      expect(new Set(usageRepository.subjectKeys)).toEqual(new Set(["198.51.100.44"]));
    } finally {
      app.set("trust proxy", 0);
    }
  });
});
