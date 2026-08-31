import { describe, expect, it } from "vitest";
import type { AnalyzeFeedbackInput, GenerateRepliesFeedbackInput } from "../ports/llm-provider.js";
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
      metadata: { provider: "mock", model: "resolve-mock-v1" },
    });
  });

  it("generates a stable, customer-aware reply", async () => {
    const provider = new MockProvider();
    const analysis = await provider.analyzeFeedback(criticalFeedback);
    const replies = await provider.generateReplies(
      criticalFeedback,
      {
        id: "analysis-id",
        feedbackId: criticalFeedback.id,
        ...analysis,
        ...analysis.metadata,
        createdAt: "2026-08-30T14:32:12.000Z",
      },
      ["empathetic"],
    );
    expect(replies[0]?.text).toContain("Здравствуйте, София!");
    expect(replies[0]?.text).toContain("списаны повторно");
  });
});
