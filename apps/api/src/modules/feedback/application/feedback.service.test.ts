import { NotFoundException } from "@nestjs/common";
import type {
  FeedbackDetails,
  PersistedFeedbackAnalysis,
} from "@resolve-signal/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  AiUsageLimitExceededError,
  type AiUsageLimiter,
} from "../../ai-usage/application/ai-usage-limiter.js";
import type { LLMProvider } from "../../ai/ports/llm-provider.js";
import type { FeedbackRepository } from "../domain/feedback.repository.js";
import { FeedbackService } from "./feedback.service.js";

const feedbackId = "11111111-1111-4111-8111-111111111111";
const analysisId = "22222222-2222-4222-8222-222222222222";
const clientIp = "203.0.113.10";

const analysis: PersistedFeedbackAnalysis = {
  id: analysisId,
  feedbackId,
  sentiment: "negative",
  severity: "medium",
  category: "delivery",
  summary: "Клиент сообщает о задержке доставки.",
  problems: ["задержка доставки"],
  provider: "openai",
  model: "gpt-5.6-luna",
  promptVersion: "openai-analysis-v1",
  inputTokens: 100,
  outputTokens: 30,
  createdAt: "2026-09-17T12:00:00.000Z",
};

function feedback(latestAnalysis: PersistedFeedbackAnalysis | null): FeedbackDetails {
  return {
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
    latestAnalysis,
    currentReplyGeneration: null,
    suggestedReplies: [],
  };
}

describe("FeedbackService AI usage reservation", () => {
  let repository: FeedbackRepository;
  let provider: LLMProvider;
  let limiter: AiUsageLimiter;
  let service: FeedbackService;

  beforeEach(() => {
    repository = {
      create: vi.fn(),
      list: vi.fn(),
      findById: vi.fn().mockResolvedValue(feedback(analysis)),
      saveAnalysis: vi.fn().mockResolvedValue(analysis),
      saveReplies: vi.fn().mockResolvedValue([]),
      updateStatus: vi.fn(),
      updateReply: vi.fn(),
      allForDashboard: vi.fn(),
    };

    provider = {
      analyzeFeedback: vi.fn().mockResolvedValue({
        sentiment: analysis.sentiment,
        severity: analysis.severity,
        category: analysis.category,
        summary: analysis.summary,
        problems: analysis.problems,
        metadata: {
          provider: analysis.provider,
          model: analysis.model,
          promptVersion: analysis.promptVersion,
          inputTokens: analysis.inputTokens,
          outputTokens: analysis.outputTokens,
        },
      }),
      generateReplies: vi.fn().mockResolvedValue({
        replies: [{ tone: "empathetic", text: "Готовый ответ." }],
        metadata: {
          provider: "openai",
          model: "gpt-5.6-luna",
          promptVersion: "openai-replies-v1",
          inputTokens: 120,
          outputTokens: 40,
        },
      }),
    };

    limiter = {
      reserve: vi.fn().mockResolvedValue(undefined),
    } as unknown as AiUsageLimiter;

    service = new FeedbackService(repository, provider, limiter);
  });

  it("does not reserve quota when feedback is not found", async () => {
    vi.mocked(repository.findById).mockResolvedValue(null);

    await expect(service.analyze(feedbackId, clientIp)).rejects.toBeInstanceOf(
      NotFoundException,
    );

    expect(limiter.reserve).not.toHaveBeenCalled();
    expect(provider.analyzeFeedback).not.toHaveBeenCalled();
  });

  it("does not call the provider when quota is rejected", async () => {
    vi.mocked(limiter.reserve).mockRejectedValue(
      new AiUsageLimitExceededError("ip_minute", 42),
    );

    await expect(service.analyze(feedbackId, clientIp)).rejects.toMatchObject({
      code: "AI_USAGE_LIMIT_EXCEEDED",
    });

    expect(provider.analyzeFeedback).not.toHaveBeenCalled();
    expect(repository.saveAnalysis).not.toHaveBeenCalled();
  });

  it("keeps one reserved unit when the provider fails", async () => {
    vi.mocked(provider.analyzeFeedback).mockRejectedValue(
      new Error("provider unavailable"),
    );

    await expect(service.analyze(feedbackId, clientIp)).rejects.toThrow(
      "provider unavailable",
    );

    expect(limiter.reserve).toHaveBeenCalledTimes(1);
    expect(provider.analyzeFeedback).toHaveBeenCalledTimes(1);
  });

  it("uses one unit for reply generation with an existing analysis", async () => {
    await service.generateReplies(feedbackId, ["empathetic"], clientIp);

    expect(limiter.reserve).toHaveBeenCalledTimes(1);
    expect(provider.analyzeFeedback).not.toHaveBeenCalled();
    expect(provider.generateReplies).toHaveBeenCalledTimes(1);
  });

  it("uses two units for successful auto-analysis and reply generation", async () => {
    vi.mocked(repository.findById).mockResolvedValue(feedback(null));

    await service.generateReplies(feedbackId, ["empathetic"], clientIp);

    expect(limiter.reserve).toHaveBeenCalledTimes(2);
    expect(provider.analyzeFeedback).toHaveBeenCalledTimes(1);
    expect(provider.generateReplies).toHaveBeenCalledTimes(1);
  });

  it("uses only one unit when automatic analysis fails", async () => {
    vi.mocked(repository.findById).mockResolvedValue(feedback(null));
    vi.mocked(provider.analyzeFeedback).mockRejectedValue(
      new Error("analysis failed"),
    );

    await expect(
      service.generateReplies(feedbackId, ["empathetic"], clientIp),
    ).rejects.toThrow("analysis failed");

    expect(limiter.reserve).toHaveBeenCalledTimes(1);
    expect(provider.generateReplies).not.toHaveBeenCalled();
    expect(repository.saveReplies).not.toHaveBeenCalled();
  });
});
