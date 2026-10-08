import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { PrismaService } from "../../../app/prisma.service.js";
import { AiUsageLimiter } from "../application/ai-usage-limiter.js";
import { PrismaAiUsageRepository } from "./prisma-ai-usage.repository.js";

// Только отдельная тестовая БД: никогда не очищаем counters обычной demo/live БД.
const testDatabaseUrl = process.env.AI_USAGE_TEST_DATABASE_URL;
const describeWithDatabase = testDatabaseUrl
  ? describe
  : describe.skip;

describeWithDatabase("PrismaAiUsageRepository atomicity", () => {
  const prisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });
  const clientIp = "198.51.100.77";

  beforeAll(async () => {
    await prisma.$connect();
  });

  beforeEach(async () => {
    await prisma.aiUsageCounter.deleteMany();
  });

  afterAll(async () => {
    await prisma.aiUsageCounter.deleteMany();
    await prisma.$disconnect();
  });

  it("never exceeds the limit during concurrent reservations and rolls back partial increments", async () => {
    const repository = new PrismaAiUsageRepository(
      prisma as unknown as PrismaService,
    );
    const limiter = new AiUsageLimiter(repository, {
      enabled: true,
      provider: "openai",
      perIpMinute: 5,
      perIpDay: 100,
      globalDay: 100,
    });
    const now = new Date("2026-09-17T12:34:18.000Z");

    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () => limiter.reserve(clientIp, now)),
    );

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(5);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(15);
    for (const result of results) {
      if (result.status === "rejected") {
        expect(result.reason).toMatchObject({ code: "AI_USAGE_LIMIT_EXCEEDED", scope: "ip_minute" });
      }
    }

    const counters = await prisma.aiUsageCounter.findMany({
      orderBy: { scope: "asc" },
    });

    expect(counters).toHaveLength(3);
    expect(counters.map((counter) => counter.count)).toEqual([5, 5, 5]);
    expect(Math.max(...counters.map((counter) => counter.count))).toBe(5);
  });

  it("enforces the shared global quota across independent clients and connections", async () => {
    const secondPrisma = new PrismaClient({ datasourceUrl: testDatabaseUrl });
    try {
      const limiters = [prisma, secondPrisma].map((connection) => new AiUsageLimiter(
        new PrismaAiUsageRepository(connection as unknown as PrismaService),
        { enabled: true, provider: "openai", perIpMinute: 5, perIpDay: 20, globalDay: 5 },
      ));
      const now = new Date("2026-09-17T13:00:00.000Z");
      const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) =>
        limiters[index % 2]!.reserve(`198.51.100.${index + 1}`, now),
      ));
      expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(5);
      for (const result of results) {
        if (result.status === "rejected") expect(result.reason).toMatchObject({ scope: "global_day" });
      }
      const global = await prisma.aiUsageCounter.findFirstOrThrow({ where: { scope: "global_day" } });
      expect(global.count).toBe(5);
      expect(await prisma.aiUsageCounter.count()).toBe(11);

      // Новый экземпляр приложения читает тот же сохранённый лимит.
      const restarted = new AiUsageLimiter(new PrismaAiUsageRepository(secondPrisma as unknown as PrismaService),
        { enabled: true, provider: "openai", perIpMinute: 5, perIpDay: 20, globalDay: 5 });
      await expect(restarted.reserve("203.0.113.9", now)).rejects.toMatchObject({ scope: "global_day" });
    } finally {
      await secondPrisma.$disconnect();
    }
  });
});
