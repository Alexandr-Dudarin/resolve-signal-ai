import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { publicDemoFeedback } from "./public-demo-data.js";
import { refreshPublicDemoFixtureMetadata } from "./public-demo-fixture-metadata.js";

function rows(variant: "legacy" | "updated" | "invalid" = "legacy") {
  return publicDemoFeedback.map((fixture, index) => ({
    id: fixture.id!,
    text: variant === "invalid" && index === 4 ? "Changed by somebody" : fixture.text,
    source: fixture.source,
    authorName: variant === "updated" ? fixture.authorName : "Демо-клиент",
    customerRef: variant === "updated" ? fixture.customerRef : null,
    externalId: variant === "updated" ? fixture.externalId : null,
    guestOwnerKey: null,
    guestExpiresAt: null,
  }));
}

function mockPrisma(resultRows = rows()) {
  const findMany = vi.fn().mockResolvedValue(resultRows);
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const transaction = vi.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
    cb({ feedbackItem: { findMany, updateMany } }));
  return {
    prisma: { $transaction: transaction } as unknown as PrismaClient,
    findMany, updateMany, transaction,
  };
}

describe("protected demo fixture labels", () => {
  it("updates only the three presentation fields for five unchanged legacy rows", async () => {
    const { prisma, updateMany } = mockPrisma();
    expect(await refreshPublicDemoFixtureMetadata(prisma)).toEqual({ updated: 5, unchanged: 0 });
    expect(updateMany).toHaveBeenCalledTimes(5);
    for (const call of updateMany.mock.calls) {
      expect(Object.keys(call[0].data).sort()).toEqual(["authorName", "customerRef", "externalId"]);
      expect(call[0].where).toMatchObject({ guestOwnerKey: null, guestExpiresAt: null, customerRef: null, externalId: null });
    }
  });

  it("is idempotent when metadata has already been refreshed", async () => {
    const { prisma, updateMany } = mockPrisma(rows("updated"));
    expect(await refreshPublicDemoFixtureMetadata(prisma)).toEqual({ updated: 0, unchanged: 5 });
    expect(updateMany).not.toHaveBeenCalled();
  });

  it("aborts before updates when a fixture differs or one is missing", async () => {
    for (const dataset of [rows("invalid"), rows().slice(0, 4)]) {
      const { prisma, updateMany } = mockPrisma(dataset);
      await expect(refreshPublicDemoFixtureMetadata(prisma)).rejects.toThrow();
      expect(updateMany).not.toHaveBeenCalled();
    }
  });

  it("throws to rollback the transaction if a conditional update matches no row", async () => {
    const { prisma, updateMany } = mockPrisma();
    updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(refreshPublicDemoFixtureMetadata(prisma)).rejects.toThrow(/concurrently/);
  });
});
