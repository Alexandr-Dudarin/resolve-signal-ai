import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { describe, it, expect } from "vitest";
import { initializePublicDemo, publicDemoFeedback } from "./public-demo-data.js";
const url = process.env.PUBLIC_DEMO_TEST_DATABASE_URL;

describe.skipIf(!url)("public demo initializer in isolated PostgreSQL", () => {
  it("is idempotent and preserves edits, replies, generations and quota counters", async () => {
    // Test cleanup is allowed ONLY in this disposable local database.
    const parsed = new URL(url!);
    if (!["localhost", "127.0.0.1"].includes(parsed.hostname) || parsed.pathname !== "/resolve_signal_demo_test" || parsed.searchParams.has("host")) {
      throw new Error("Use isolated local resolve_signal_demo_test only");
    }
    const prisma = new PrismaClient({ datasourceUrl: url });
    const feedbackId = randomUUID(); const analysisId = randomUUID(); const generationId = randomUUID(); const counterId = randomUUID();
    const syntheticIds = publicDemoFeedback.map((x) => x.id!);
    try {
      await prisma.feedbackItem.deleteMany({ where: { id: { in: syntheticIds } } });
      await prisma.feedbackItem.create({ data: { id: feedbackId, source: "manual", text: "Test-only visitor data" } });
      await prisma.feedbackAnalysis.create({ data: { id: analysisId, feedbackId, sentiment: "neutral", severity: "low", category: "other", summary: "Test", problems: [], provider: "mock", model: "test", promptVersion: "test" } });
      await prisma.replyGeneration.create({ data: { id: generationId, feedbackId, analysisId, provider: "mock", model: "test", promptVersion: "test" } });
      await prisma.suggestedReply.create({ data: { feedbackId, analysisId, generationId, text: "Visitor edited reply", status: "approved" } });
      await prisma.aiUsageCounter.create({ data: { id: counterId, scope: "ip_day", subjectKey: randomUUID(), windowStart: new Date("2026-01-01"), count: 7 } });
      const before = await prisma.feedbackItem.findUnique({ where: { id: feedbackId }, include: { replies: true, analyses: true, replyGenerations: true } });
      expect((await initializePublicDemo(prisma)).count).toBe(5);
      await prisma.feedbackItem.update({ where: { id: syntheticIds[0]! }, data: { text: "An edited synthetic example" } });
      expect((await initializePublicDemo(prisma)).count).toBe(0);
      expect((await prisma.feedbackItem.findUniqueOrThrow({ where: { id: syntheticIds[0]! } })).text).toBe("An edited synthetic example");
      expect(await prisma.feedbackItem.findUnique({ where: { id: feedbackId }, include: { replies: true, analyses: true, replyGenerations: true } })).toEqual(before);
      expect((await prisma.aiUsageCounter.findUniqueOrThrow({ where: { id: counterId } })).count).toBe(7);
    } finally {
      await prisma.feedbackItem.deleteMany({ where: { id: { in: [feedbackId, ...syntheticIds] } } });
      await prisma.aiUsageCounter.deleteMany({ where: { id: counterId } });
      await prisma.$disconnect();
    }
  });
});
