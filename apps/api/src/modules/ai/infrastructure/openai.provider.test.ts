import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersistedFeedbackAnalysis } from "@resolve-signal/contracts";

const { parseMock } = vi.hoisted(() => ({
  parseMock: vi.fn(),
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    responses = {
      parse: parseMock,
    };
  },
}));

import { OpenAIProvider } from "./openai.provider.js";

describe("OpenAIProvider", () => {
  beforeEach(() => {
    parseMock.mockReset();
  });

  it("parses structured feedback analysis and preserves metadata", async () => {
    parseMock.mockResolvedValueOnce({
      output_parsed: {
        sentiment: "mixed",
        severity: "low",
        category: "product",
        summary:
          "Клиент доволен товаром, но сообщает о сильно повреждённой упаковке.",
        problems: ["Сильно повреждена упаковка товара"],
      },
      usage: {
        input_tokens: 123,
        output_tokens: 45,
      },
    });

    const provider = new OpenAIProvider(
      "test-key",
      "test-model",
    );

    const result = await provider.analyzeFeedback({
      id: "11111111-1111-4111-8111-111111111111",
      source: "store_review",
      rating: 4,
      text: "Товар соответствует ожиданиям, всё работает как следует, но упаковка была сильно помята.",
    });

    expect(result).toEqual({
      sentiment: "mixed",
      severity: "low",
      category: "product",
      summary:
        "Клиент доволен товаром, но сообщает о сильно повреждённой упаковке.",
      problems: ["Сильно повреждена упаковка товара"],
      metadata: {
        provider: "openai",
        model: "test-model",
        promptVersion: "openai-analysis-v1",
        inputTokens: 123,
        outputTokens: 45,
      },
    });

    expect(parseMock).toHaveBeenCalledTimes(1);

    const request = parseMock.mock.calls[0]?.[0];

    expect(request).toMatchObject({
      model: "test-model",
      store: false,
    });

    expect(request.input).toContain(
      "упаковка была сильно помята",
    );

    expect(request.instructions).toContain(
      "Sentiment и severity оцениваются независимо.",
    );
  });

  it("throws when OpenAI returns no parsed analysis", async () => {
    parseMock.mockResolvedValueOnce({
      output_parsed: null,
      usage: {
        input_tokens: 10,
        output_tokens: 0,
      },
    });

    const provider = new OpenAIProvider(
      "test-key",
      "test-model",
    );

    await expect(
      provider.analyzeFeedback({
        id: "11111111-1111-4111-8111-111111111111",
        source: "manual",
        rating: null,
        text: "Тестовое обращение клиента.",
      }),
    ).rejects.toThrow(
      "OpenAI returned no parsed feedback analysis",
    );
  });

  it("returns generated replies with generation metadata", async () => {
    parseMock.mockResolvedValueOnce({
      output_parsed: {
        replies: [
          {
            tone: "concise",
            text: "Спасибо за отзыв. Нам жаль, что упаковка была повреждена.",
          },
          {
            tone: "empathetic",
            text: "Спасибо, что рассказали об этом. Рады, что товар оправдал ожидания, и нам жаль, что упаковка пришла повреждённой.",
          },
        ],
      },
      usage: {
        input_tokens: 150,
        output_tokens: 80,
      },
    });

    const provider = new OpenAIProvider(
      "test-key",
      "test-model",
    );

    const analysis: PersistedFeedbackAnalysis = {
      id: "22222222-2222-4222-8222-222222222222",
      feedbackId: "11111111-1111-4111-8111-111111111111",
      sentiment: "mixed",
      severity: "low",
      category: "product",
      summary:
        "Клиент доволен товаром, но сообщает о повреждённой упаковке.",
      problems: ["Повреждена упаковка товара"],
      provider: "openai",
      model: "test-model",
      promptVersion: "openai-analysis-v1",
      inputTokens: 123,
      outputTokens: 45,
      createdAt: "2026-09-12T12:00:00.000Z",
    };

    const result = await provider.generateReplies(
      {
        id: "11111111-1111-4111-8111-111111111111",
        source: "store_review",
        rating: 4,
        text: "Товар хороший, но упаковка была сильно помята.",
        authorName: "Роман",
      },
      analysis,
      ["concise", "empathetic"],
    );

    expect(result).toEqual({
      replies: [
        {
          tone: "concise",
          text: "Спасибо за отзыв. Нам жаль, что упаковка была повреждена.",
        },
        {
          tone: "empathetic",
          text: "Спасибо, что рассказали об этом. Рады, что товар оправдал ожидания, и нам жаль, что упаковка пришла повреждённой.",
        },
      ],
      metadata: {
        provider: "openai",
        model: "test-model",
        promptVersion: "openai-replies-v1",
        inputTokens: 150,
        outputTokens: 80,
      },
    });

    expect(parseMock).toHaveBeenCalledTimes(1);
  });

  it("rejects replies that do not match requested tones", async () => {
    parseMock.mockResolvedValueOnce({
      output_parsed: {
        replies: [
          {
            tone: "unexpected-tone",
            text: "Некорректный вариант ответа.",
          },
        ],
      },
    });

    const provider = new OpenAIProvider(
      "test-key",
      "test-model",
    );

    const analysis: PersistedFeedbackAnalysis = {
      id: "22222222-2222-4222-8222-222222222222",
      feedbackId: "11111111-1111-4111-8111-111111111111",
      sentiment: "negative",
      severity: "medium",
      category: "delivery",
      summary: "Клиент сообщает о задержке доставки.",
      problems: ["Задержка доставки"],
      provider: "openai",
      model: "test-model",
      promptVersion: "openai-analysis-v1",
      inputTokens: 100,
      outputTokens: 30,
      createdAt: "2026-09-12T12:00:00.000Z",
    };

    await expect(
      provider.generateReplies(
        {
          id: "11111111-1111-4111-8111-111111111111",
          source: "store_review",
          rating: 2,
          text: "Доставка сильно задержалась.",
          authorName: "Анна",
        },
        analysis,
        ["empathetic"],
      ),
    ).rejects.toThrow(
      "OpenAI returned suggested replies that do not match requested tones",
    );
  });
});
