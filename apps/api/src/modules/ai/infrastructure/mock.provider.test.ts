import { describe, expect, it } from "vitest";

import type { PersistedFeedbackAnalysis } from "@resolve-signal/contracts";

import type {
  AnalyzeFeedbackInput,
  GenerateRepliesFeedbackInput,
} from "../ports/llm-provider.js";

import { MockProvider } from "./mock.provider.js";

const criticalFeedback: GenerateRepliesFeedbackInput = {
  id: "33333333-3333-4333-8333-333333333333",
  source: "web_form",
  rating: 1,
  text: "Деньги списали дважды, а поддержка не отвечает уже три дня.",
  authorName: "София Волкова",
};

describe("MockProvider", () => {
  it("returns the approved deterministic critical payment analysis", async () => {
    const analysisInput: AnalyzeFeedbackInput = criticalFeedback;

    const result = await new MockProvider().analyzeFeedback(analysisInput);

    expect(result).toMatchObject({
      sentiment: "negative",
      severity: "critical",
      category: "payment",
      problems: ["повторное списание", "поддержка не отвечает"],
      metadata: {
        provider: "mock",
        model: "resolve-mock-v1",
      },
    });
  });

  it("generates a stable, customer-aware reply with generation metadata", async () => {
    const provider = new MockProvider();

    const analysisResult =
      await provider.analyzeFeedback(criticalFeedback);

    const { metadata, ...analysisPayload } = analysisResult;

    const persistedAnalysis: PersistedFeedbackAnalysis = {
      id: "22222222-2222-4222-8222-222222222222",
      feedbackId: criticalFeedback.id,
      ...analysisPayload,
      ...metadata,
      createdAt: "2026-08-30T14:32:12.000Z",
    };

    const result = await provider.generateReplies(
      criticalFeedback,
      persistedAnalysis,
      ["empathetic"],
    );

    expect(result.replies).toHaveLength(1);

    expect(result.replies[0]?.text).toContain(
      "Здравствуйте, София!",
    );

    expect(result.replies[0]?.text).toContain(
      "списаны повторно",
    );

    expect(result.metadata).toMatchObject({
      provider: "mock",
      model: "resolve-mock-v1",
      promptVersion: "mock-replies-v1",
    });

    expect(result.metadata.inputTokens).toEqual(
      expect.any(Number),
    );

    expect(result.metadata.outputTokens).toEqual(
      expect.any(Number),
    );
  });
});
