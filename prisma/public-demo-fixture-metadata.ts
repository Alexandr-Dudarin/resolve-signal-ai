import type { PrismaClient } from "@prisma/client";
import { publicDemoFeedback } from "./public-demo-data.js";

/**
 * One-time, metadata-only refresh for the five fixed synthetic fixtures.
 * Intentionally separate from insert-only initializePublicDemo: never update
 * customer content, status, guest ownership, analysis, replies, or counters.
 */
export async function refreshPublicDemoFixtureMetadata(prisma: PrismaClient) {
  const fixtures = publicDemoFeedback.map((fixture) => {
    if (!fixture.id || !fixture.text || !fixture.authorName || !fixture.customerRef || !fixture.externalId) {
      throw new Error("Incomplete synthetic fixture metadata");
    }
    return {
      id: fixture.id,
      text: fixture.text,
      source: fixture.source,
      authorName: fixture.authorName,
      customerRef: fixture.customerRef,
      externalId: fixture.externalId,
    };
  });

  return prisma.$transaction(async (tx) => {
    const existing = await tx.feedbackItem.findMany({
      where: { id: { in: fixtures.map((fixture) => fixture.id) } },
      select: {
        id: true, text: true, source: true, authorName: true,
        customerRef: true, externalId: true, guestOwnerKey: true, guestExpiresAt: true,
      },
    });
    if (existing.length !== fixtures.length) {
      throw new Error("Expected exactly five existing protected fixtures; no records updated");
    }

    // Check all rows before the first mutation. A partially edited or
    // unexpected fixture causes the whole transaction to abort.
    const needsUpdate = fixtures.filter((fixture) => {
      const row = existing.find((record) => record.id === fixture.id);
      if (!row || row.text !== fixture.text || row.source !== fixture.source ||
          row.guestOwnerKey !== null || row.guestExpiresAt !== null) {
        throw new Error("Unexpected protected fixture identity or content; no records updated");
      }
      if (row.authorName === fixture.authorName && row.customerRef === fixture.customerRef &&
          row.externalId === fixture.externalId) return false;
      if (row.authorName === "Демо-клиент" && row.customerRef === null && row.externalId === null) return true;
      throw new Error("Fixture metadata was edited independently; refusing to overwrite it");
    });

    for (const fixture of needsUpdate) {
      const result = await tx.feedbackItem.updateMany({
        where: {
          id: fixture.id, text: fixture.text, source: fixture.source,
          guestOwnerKey: null, guestExpiresAt: null,
          authorName: "Демо-клиент", customerRef: null, externalId: null,
        },
        data: {
          authorName: fixture.authorName,
          customerRef: fixture.customerRef,
          externalId: fixture.externalId,
        },
      });
      if (result.count !== 1) throw new Error("Fixture changed concurrently; rolling back metadata refresh");
    }
    return { updated: needsUpdate.length, unchanged: fixtures.length - needsUpdate.length };
  });
}
