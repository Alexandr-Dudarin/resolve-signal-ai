import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { initializePublicDemoShowcase, publicDemoShowcase } from "./public-demo-showcase-data.js";

function mockPrisma(existing: unknown[] = []) {
  const findMany = vi.fn().mockResolvedValue(existing);
  const feedbackCreate = vi.fn().mockResolvedValue({});
  const analysisCreate = vi.fn().mockResolvedValue({});
  const repliesCreateMany = vi.fn().mockResolvedValue({ count: 1 });
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
    callback({
      feedbackItem: { findMany, create: feedbackCreate },
      feedbackAnalysis: { create: analysisCreate },
      suggestedReply: { createMany: repliesCreateMany },
    }));
  const prisma = { $transaction: transaction } as unknown as PrismaClient;
  return { prisma, findMany, feedbackCreate, analysisCreate, repliesCreateMany, transaction };
}

function allExisting() {
  return publicDemoShowcase.map((fixture) => ({
    id: fixture.feedback.id,
    source: fixture.feedback.source,
    text: fixture.feedback.text,
    authorName: fixture.feedback.authorName,
    customerRef: fixture.feedback.customerRef ?? null,
    externalId: fixture.feedback.externalId ?? null,
    rating: fixture.feedback.rating ?? null,
    status: fixture.feedback.status,
    guestOwnerKey: null,
    guestExpiresAt: null,
    analyses: [{ id: fixture.analysis.id, provider: fixture.analysis.provider, model: fixture.analysis.model }],
    replies: fixture.replies.map((reply) => ({ id: reply.id })),
  }));
}

describe("protected, prepared public demo showcases", () => {
  it("inserts three examples with analyses and replies in a single transaction", async () => {
    const { prisma, feedbackCreate, analysisCreate, repliesCreateMany, transaction } = mockPrisma();
    expect(await initializePublicDemoShowcase(prisma)).toEqual({ created: 3, unchanged: 0 });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(feedbackCreate).toHaveBeenCalledTimes(3);
    expect(analysisCreate).toHaveBeenCalledTimes(3);
    expect(repliesCreateMany).toHaveBeenCalledTimes(2);
    expect(publicDemoShowcase.map((item) => item.feedback.authorName)).toEqual([
      "София Волкова", "Дмитрий Соколов", "Анна Смирнова",
    ]);
    expect(publicDemoShowcase.every(
      (item) => item.analysis.provider === "mock" && item.analysis.model === "resolve-mock-v1",
    )).toBe(true);
  });

  it("is idempotent and never updates existing records or AI history", async () => {
    const { prisma, feedbackCreate, analysisCreate, repliesCreateMany } = mockPrisma(allExisting());
    expect(await initializePublicDemoShowcase(prisma)).toEqual({ created: 0, unchanged: 3 });
    expect(feedbackCreate).not.toHaveBeenCalled();
    expect(analysisCreate).not.toHaveBeenCalled();
    expect(repliesCreateMany).not.toHaveBeenCalled();
  });

  it("rejects ID collisions, modified originals and incomplete prepared history before any insert", async () => {
    for (const changed of [
      { ...allExisting()[0], text: "Changed user data" },
      { ...allExisting()[0], guestOwnerKey: "owner" },
      { ...allExisting()[0], analyses: [] },
      { ...allExisting()[0], replies: [] },
    ]) {
      const { prisma, feedbackCreate, analysisCreate, repliesCreateMany } = mockPrisma([changed]);
      await expect(initializePublicDemoShowcase(prisma)).rejects.toThrow();
      expect(feedbackCreate).not.toHaveBeenCalled();
      expect(analysisCreate).not.toHaveBeenCalled();
      expect(repliesCreateMany).not.toHaveBeenCalled();
    }
  });

  it("inserts only missing examples while preserving a matching existing showcase", async () => {
    const { prisma, feedbackCreate, analysisCreate, repliesCreateMany } = mockPrisma([allExisting()[0]]);
    expect(await initializePublicDemoShowcase(prisma)).toEqual({ created: 2, unchanged: 1 });
    expect(feedbackCreate).toHaveBeenCalledTimes(2);
    expect(analysisCreate).toHaveBeenCalledTimes(2);
    expect(repliesCreateMany).toHaveBeenCalledTimes(1);
  });
});
