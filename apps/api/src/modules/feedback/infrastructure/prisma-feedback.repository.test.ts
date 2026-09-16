import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaService } from "../../../app/prisma.service.js";

import type { GeneratedRepliesResult } from "../../ai/ports/llm-provider.js";

import { PrismaFeedbackRepository } from "./prisma-feedback.repository.js";

const feedbackId =
  "11111111-1111-4111-8111-111111111111";

const analysisId =
  "22222222-2222-4222-8222-222222222222";

const createdAt =
  new Date("2026-09-16T12:00:00.000Z");

describe("PrismaFeedbackRepository reply history", () => {
  let replyGenerationUpdateMany: ReturnType<typeof vi.fn>;
  let replyGenerationCreate: ReturnType<typeof vi.fn>;
  let suggestedReplyCreate: ReturnType<typeof vi.fn>;
  let suggestedReplyFindUnique: ReturnType<typeof vi.fn>;
  let suggestedReplyUpdate: ReturnType<typeof vi.fn>;
  let feedbackItemFindUnique: ReturnType<typeof vi.fn>;

  let repository: PrismaFeedbackRepository;

  beforeEach(() => {
    replyGenerationUpdateMany = vi.fn().mockResolvedValue({
      count: 1,
    });

    replyGenerationCreate = vi.fn().mockResolvedValue({
      id: "33333333-3333-4333-8333-333333333333",
    });

    suggestedReplyCreate = vi
      .fn()
      .mockImplementation(({ data }) =>
        Promise.resolve({
          id: `reply-${data.tone}`,
          ...data,
          status: "draft",
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        }),
      );

    suggestedReplyFindUnique = vi.fn();

    suggestedReplyUpdate = vi.fn();
    feedbackItemFindUnique = vi.fn();

    const transactionClient = {
      replyGeneration: {
        updateMany: replyGenerationUpdateMany,
        create: replyGenerationCreate,
      },

      suggestedReply: {
        create: suggestedReplyCreate,
      },
    };

    const prisma = {
      $transaction: vi.fn(
        async (
          callback: (
            tx: typeof transactionClient,
          ) => Promise<unknown>,
        ) => callback(transactionClient),
      ),

      suggestedReply: {
        findUnique: suggestedReplyFindUnique,
        update: suggestedReplyUpdate,
      },

      feedbackItem: {
        findUnique: feedbackItemFindUnique,
      },
    } as unknown as PrismaService;

    repository = new PrismaFeedbackRepository(prisma);
  });

  it("creates a generation batch and preserves original AI text", async () => {
    const result: GeneratedRepliesResult = {
      replies: [
        {
          tone: "concise",
          text: "Краткий ответ AI.",
        },
        {
          tone: "empathetic",
          text: "Эмпатичный ответ AI.",
        },
      ],

      metadata: {
        provider: "openai",
        model: "gpt-5.6-luna",
        promptVersion: "openai-replies-v1",
        inputTokens: 150,
        outputTokens: 80,
      },
    };

    const saved = await repository.saveReplies(
      feedbackId,
      analysisId,
      result,
    );

    expect(replyGenerationUpdateMany).toHaveBeenCalledWith({
      where: {
        feedbackId,
        supersededAt: null,
      },
      data: {
        supersededAt: expect.any(Date),
      },
    });

    expect(replyGenerationCreate).toHaveBeenCalledWith({
      data: {
        feedbackId,
        analysisId,
        provider: "openai",
        model: "gpt-5.6-luna",
        promptVersion: "openai-replies-v1",
        inputTokens: 150,
        outputTokens: 80,
      },
    });

    expect(suggestedReplyCreate).toHaveBeenNthCalledWith(
      1,
      {
        data: {
          feedbackId,
          analysisId,
          generationId:
            "33333333-3333-4333-8333-333333333333",
          tone: "concise",
          originalText: "Краткий ответ AI.",
          text: "Краткий ответ AI.",
        },
      },
    );

    expect(saved).toHaveLength(2);
  });

  it("preserves original AI text when a generated reply is edited", async () => {
    suggestedReplyFindUnique.mockResolvedValue({
      id: "reply-1",
      text: "Исходный ответ AI.",
      originalText: "Исходный ответ AI.",
    });

    suggestedReplyUpdate.mockImplementation(
      ({ data }) =>
        Promise.resolve({
          id: "reply-1",
          feedbackId,
          analysisId,
          generationId:
            "33333333-3333-4333-8333-333333333333",
          tone: "empathetic",
          originalText: "Исходный ответ AI.",
          text: data.text,
          status: "draft",
          editedAt: data.editedAt,
          createdAt,
          updatedAt: createdAt,
        }),
    );

    await repository.updateReply("reply-1", {
      text: "Отредактированный человеком ответ.",
    });

    expect(suggestedReplyUpdate).toHaveBeenCalledWith({
      where: {
        id: "reply-1",
      },
      data: {
        text: "Отредактированный человеком ответ.",
        editedAt: expect.any(Date),
      },
    });
  });

  it("does not invent original AI text for a status-only legacy update", async () => {
    suggestedReplyFindUnique.mockResolvedValue({
      id: "legacy-reply",
      text: "Старый ответ с неизвестной историей.",
      originalText: null,
    });

    suggestedReplyUpdate.mockResolvedValue({
      id: "legacy-reply",
      feedbackId,
      analysisId,
      generationId: null,
      tone: "empathetic",
      originalText: null,
      text: "Старый ответ с неизвестной историей.",
      status: "approved",
      editedAt: null,
      createdAt,
      updatedAt: createdAt,
    });

    await repository.updateReply("legacy-reply", {
      status: "approved",
    });

    expect(suggestedReplyUpdate).toHaveBeenCalledWith({
      where: {
        id: "legacy-reply",
      },
      data: {
        status: "approved",
      },
    });
  });

  it("keeps original AI text unknown when a legacy reply is edited", async () => {
    suggestedReplyFindUnique.mockResolvedValue({
      id: "legacy-reply",
      text: "Старый текст до правки.",
      originalText: null,
    });

    suggestedReplyUpdate.mockImplementation(
      ({ data }) =>
        Promise.resolve({
          id: "legacy-reply",
          feedbackId,
          analysisId,
          generationId: null,
          tone: "concise",
          originalText: null,
          text: data.text,
          status: "draft",
          editedAt: data.editedAt,
          createdAt,
          updatedAt: createdAt,
        }),
    );

    await repository.updateReply("legacy-reply", {
      text: "Новый текст после правки.",
    });

    expect(suggestedReplyUpdate).toHaveBeenCalledWith({
      where: {
        id: "legacy-reply",
      },
      data: {
        text: "Новый текст после правки.",
        editedAt: expect.any(Date),
      },
    });
  });

  it("maps the active generation, current replies, and historical decisions", async () => {
    const currentGenerationId =
      "33333333-3333-4333-8333-333333333333";
    const supersededGenerationId =
      "44444444-4444-4444-8444-444444444444";

    feedbackItemFindUnique.mockResolvedValue({
      id: feedbackId,
      source: "manual",
      externalId: null,
      rating: 2,
      text: "Нужно проверить варианты ответа.",
      authorName: "Мария",
      customerRef: null,
      status: "new",
      createdAt,
      updatedAt: createdAt,
      analyses: [],
      replyGenerations: [
        {
          id: currentGenerationId,
          feedbackId,
          analysisId,
          provider: "openai",
          model: "gpt-5.6-luna",
          promptVersion: "openai-replies-v1",
          inputTokens: 268,
          outputTokens: 168,
          supersededAt: null,
          createdAt,
        },
      ],
      replies: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          feedbackId,
          analysisId,
          generationId: currentGenerationId,
          tone: "empathetic",
          originalText: "Текущий черновик.",
          text: "Текущий черновик.",
          status: "draft",
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "66666666-6666-4666-8666-666666666666",
          feedbackId,
          analysisId,
          generationId: supersededGenerationId,
          tone: "concise",
          originalText: "Старый черновик.",
          text: "Старый черновик.",
          status: "draft",
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "77777777-7777-4777-8777-777777777777",
          feedbackId,
          analysisId,
          generationId: supersededGenerationId,
          tone: "empathetic",
          originalText: "Историческое решение.",
          text: "Историческое решение после правки.",
          status: "approved",
          editedAt: createdAt,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "88888888-8888-4888-8888-888888888888",
          feedbackId,
          analysisId,
          generationId: null,
          tone: "concise",
          originalText: null,
          text: "Старый legacy-черновик.",
          status: "draft",
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "99999999-9999-4999-8999-999999999999",
          feedbackId,
          analysisId,
          generationId: null,
          tone: "concise",
          originalText: null,
          text: "Старое отклонённое решение.",
          status: "rejected",
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        },
      ],
    });

    const details = await repository.findById(feedbackId);

    expect(details?.currentReplyGeneration).toEqual({
      id: currentGenerationId,
      feedbackId,
      analysisId,
      provider: "openai",
      model: "gpt-5.6-luna",
      promptVersion: "openai-replies-v1",
      inputTokens: 268,
      outputTokens: 168,
      supersededAt: null,
      createdAt: createdAt.toISOString(),
    });

    expect(details?.suggestedReplies.map((reply) => reply.id)).toEqual([
      "55555555-5555-4555-8555-555555555555",
      "77777777-7777-4777-8777-777777777777",
      "99999999-9999-4999-8999-999999999999",
    ]);

    expect(details?.suggestedReplies[1]).toMatchObject({
      originalText: "Историческое решение.",
      editedAt: createdAt.toISOString(),
    });
  });

  it("keeps all legacy replies visible before the first generation", async () => {
    feedbackItemFindUnique.mockResolvedValue({
      id: feedbackId,
      source: "manual",
      externalId: null,
      rating: null,
      text: "Обращение со старыми ответами.",
      authorName: null,
      customerRef: null,
      status: "new",
      createdAt,
      updatedAt: createdAt,
      analyses: [],
      replyGenerations: [],
      replies: [
        {
          id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
          feedbackId,
          analysisId,
          generationId: null,
          tone: "empathetic",
          originalText: null,
          text: "Legacy-черновик.",
          status: "draft",
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        },
        {
          id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
          feedbackId,
          analysisId,
          generationId: null,
          tone: "concise",
          originalText: null,
          text: "Legacy-решение.",
          status: "approved",
          editedAt: null,
          createdAt,
          updatedAt: createdAt,
        },
      ],
    });

    const details = await repository.findById(feedbackId);

    expect(details?.currentReplyGeneration).toBeNull();
    expect(details?.suggestedReplies).toHaveLength(2);
  });
});
