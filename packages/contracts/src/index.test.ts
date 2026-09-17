import { describe, expect, it } from "vitest";

import {
  CreateFeedbackSchema,
  EntityIdSchema,
  FeedbackAnalysisSchema,
  FeedbackDetailsSchema,
  ReplyGenerationSchema,
  SuggestedReplySchema,
} from "./index.js";

const feedbackId = "11111111-1111-4111-8111-111111111111";
const analysisId = "22222222-2222-4222-8222-222222222222";
const generationId = "33333333-3333-4333-8333-333333333333";
const replyId = "44444444-4444-4444-8444-444444444444";
const timestamp = "2026-09-16T12:00:00.000Z";

const generation = {
  id: generationId,
  feedbackId,
  analysisId,
  provider: "openai",
  model: "gpt-5.6-luna",
  promptVersion: "openai-replies-v1",
  inputTokens: 268,
  outputTokens: 168,
  supersededAt: null,
  createdAt: timestamp,
};

const reply = {
  id: replyId,
  feedbackId,
  analysisId,
  generationId,
  tone: "empathetic",
  originalText: "Исходный ответ AI.",
  text: "Отредактированный ответ.",
  status: "approved" as const,
  editedAt: timestamp,
  createdAt: timestamp,
  updatedAt: timestamp,
};

describe("shared contracts", () => {
  it("normalizes a valid feedback payload", () => {
    expect(
      CreateFeedbackSchema.parse({
        text: "  Delivery arrived late.  ",
        rating: 3,
        authorName: "   ",
        customerRef: "",
      }),
    ).toEqual({ text: "Delivery arrived late.", rating: 3, source: "manual" });
  });

  it("rejects invalid structured analysis", () => {
    expect(() =>
      FeedbackAnalysisSchema.parse({
        sentiment: "angry",
        severity: "critical",
        category: "payment",
        summary: "Invalid sentiment",
        problems: [],
      }),
    ).toThrow();
  });

  it("rejects malformed entity identifiers before they reach persistence", () => {
    expect(() => EntityIdSchema.parse("not-a-uuid")).toThrow();
  });

  it("validates reply generation metadata", () => {
    expect(ReplyGenerationSchema.parse(generation)).toEqual(generation);
    expect(() =>
      ReplyGenerationSchema.parse({
        ...generation,
        inputTokens: -1,
      }),
    ).toThrow();
  });

  it("validates generation and human-edit fields on suggested replies", () => {
    expect(SuggestedReplySchema.parse(reply)).toEqual(reply);
    expect(
      SuggestedReplySchema.parse({
        ...reply,
        generationId: null,
        originalText: null,
        editedAt: null,
      }),
    ).toMatchObject({
      generationId: null,
      originalText: null,
      editedAt: null,
    });
  });

  it("exposes the current reply generation on feedback details", () => {
    const details = FeedbackDetailsSchema.parse({
      id: feedbackId,
      source: "manual",
      externalId: null,
      rating: null,
      text: "Проверяем состояние генерации ответов.",
      authorName: null,
      customerRef: null,
      status: "new",
      createdAt: timestamp,
      updatedAt: timestamp,
      latestAnalysis: null,
      currentReplyGeneration: generation,
      suggestedReplies: [reply],
    });

    expect(details.currentReplyGeneration).toEqual(generation);
  });
});
