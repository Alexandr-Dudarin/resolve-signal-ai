import { describe, expect, it, vi } from "vitest";

import type {
  AiUsageCounterReservation,
  AiUsageRepository,
  AiUsageReservationResult,
} from "../domain/ai-usage.repository.js";
import {
  AiUsageLimitExceededError,
  AiUsageLimiter,
  type AiUsageConfig,
} from "./ai-usage-limiter.js";

class MemoryAiUsageRepository implements AiUsageRepository {
  private readonly counts = new Map<string, number>();

  async reserve(
    counters: AiUsageCounterReservation[],
  ): Promise<AiUsageReservationResult> {
    for (const counter of counters) {
      const key = this.key(counter);
      if ((this.counts.get(key) ?? 0) >= counter.limit) {
        return { allowed: false, scope: counter.scope };
      }
    }

    for (const counter of counters) {
      const key = this.key(counter);
      this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
    }

    return { allowed: true };
  }

  private key(counter: AiUsageCounterReservation) {
    return [
      counter.scope,
      counter.subjectKey,
      counter.windowStart.toISOString(),
    ].join(":");
  }
}

const defaultConfig: AiUsageConfig = {
  enabled: true,
  provider: "openai",
  perIpMinute: 5,
  perIpDay: 20,
  globalDay: 100,
};

const now = new Date("2026-09-17T12:34:18.250Z");

describe("AiUsageLimiter", () => {
  it("allows five IP minute units and rejects the sixth", async () => {
    const limiter = new AiUsageLimiter(
      new MemoryAiUsageRepository(),
      defaultConfig,
    );

    for (let index = 0; index < 5; index += 1) {
      await expect(limiter.reserve("203.0.113.10", now)).resolves.toBeUndefined();
    }

    await expect(limiter.reserve("203.0.113.10", now)).rejects.toMatchObject({
      code: "AI_USAGE_LIMIT_EXCEEDED",
      scope: "ip_minute",
      retryAfterSeconds: 42,
    });
  });

  it("allows twenty IP daily units and rejects the twenty-first", async () => {
    const limiter = new AiUsageLimiter(
      new MemoryAiUsageRepository(),
      { ...defaultConfig, perIpMinute: 25 },
    );

    for (let index = 0; index < 20; index += 1) {
      await limiter.reserve("203.0.113.20", now);
    }

    await expect(limiter.reserve("203.0.113.20", now)).rejects.toMatchObject({
      scope: "ip_day",
    });
  });

  it("allows one hundred global daily units and rejects the one-hundred-first", async () => {
    const limiter = new AiUsageLimiter(
      new MemoryAiUsageRepository(),
      {
        ...defaultConfig,
        perIpMinute: 200,
        perIpDay: 200,
      },
    );

    for (let index = 0; index < 100; index += 1) {
      await limiter.reserve(`203.0.113.${index + 1}`, now);
    }

    await expect(limiter.reserve("198.51.100.1", now)).rejects.toMatchObject({
      scope: "global_day",
    });
  });

  it("resets burst quota at the next UTC minute", async () => {
    const limiter = new AiUsageLimiter(
      new MemoryAiUsageRepository(),
      { ...defaultConfig, perIpMinute: 1 },
    );

    await limiter.reserve("203.0.113.30", now);
    await expect(limiter.reserve("203.0.113.30", now)).rejects.toBeInstanceOf(
      AiUsageLimitExceededError,
    );
    await expect(
      limiter.reserve(
        "203.0.113.30",
        new Date("2026-09-17T12:35:00.000Z"),
      ),
    ).resolves.toBeUndefined();
  });

  it("resets IP and global daily quota at UTC midnight", async () => {
    const limiter = new AiUsageLimiter(
      new MemoryAiUsageRepository(),
      {
        ...defaultConfig,
        perIpMinute: 5,
        perIpDay: 1,
        globalDay: 1,
      },
    );

    await limiter.reserve(
      "203.0.113.40",
      new Date("2026-09-17T23:59:30.000Z"),
    );
    await expect(
      limiter.reserve(
        "203.0.113.40",
        new Date("2026-09-18T00:00:00.000Z"),
      ),
    ).resolves.toBeUndefined();
  });

  it("reports exhausted scopes in global, IP day, IP minute priority", async () => {
    const limiter = new AiUsageLimiter(
      new MemoryAiUsageRepository(),
      {
        enabled: true,
        provider: "openai",
        perIpMinute: 1,
        perIpDay: 1,
        globalDay: 1,
      },
    );

    await limiter.reserve("203.0.113.50", now);

    await expect(limiter.reserve("203.0.113.50", now)).rejects.toMatchObject({
      scope: "global_day",
    });
  });

  it("bypasses cost counters in mock mode and when limits are disabled", async () => {
    const repository = {
      reserve: vi.fn(),
    } satisfies AiUsageRepository;

    const mockLimiter = new AiUsageLimiter(repository, {
      ...defaultConfig,
      provider: "mock",
    });
    const disabledLimiter = new AiUsageLimiter(repository, {
      ...defaultConfig,
      enabled: false,
    });

    await mockLimiter.reserve("203.0.113.60", now);
    await disabledLimiter.reserve("203.0.113.60", now);

    expect(repository.reserve).not.toHaveBeenCalled();
  });

  it("prioritizes IP day over minute and computes retry at UTC midnight", async () => {
    const limiter = new AiUsageLimiter(new MemoryAiUsageRepository(), {
      ...defaultConfig, perIpMinute: 1, perIpDay: 1,
    });
    const instant = new Date("2026-09-17T23:59:18.250Z");
    await limiter.reserve("203.0.113.70", instant);
    await expect(limiter.reserve("203.0.113.70", instant)).rejects.toMatchObject({
      scope: "ip_day", retryAfterSeconds: 42,
    });
  });
});
