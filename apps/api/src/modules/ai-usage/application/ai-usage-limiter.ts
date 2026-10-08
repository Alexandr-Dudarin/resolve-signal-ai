import { Inject, Injectable } from "@nestjs/common";
import type {
  AiUsageLimitError,
  AiUsageLimitScope,
} from "@resolve-signal/contracts";

import type { ApiEnv } from "../../../app/env.js";
import {
  AI_USAGE_REPOSITORY,
  type AiUsageCounterReservation,
  type AiUsageRepository,
} from "../domain/ai-usage.repository.js";

export const AI_USAGE_CONFIG = Symbol("AI_USAGE_CONFIG");

export type AiUsageConfig = {
  enabled: boolean;
  provider: "mock" | "openai";
  perIpMinute: number;
  perIpDay: number;
  globalDay: number;
};

export function createAiUsageConfig(env: ApiEnv): AiUsageConfig {
  return {
    enabled: env.AI_USAGE_LIMITS_ENABLED,
    provider: env.AI_PROVIDER,
    perIpMinute: env.AI_LIMIT_PER_IP_MINUTE,
    perIpDay: env.AI_LIMIT_PER_IP_DAY,
    globalDay: env.AI_LIMIT_GLOBAL_DAY,
  };
}

export class AiUsageLimitExceededError extends Error {
  readonly code = "AI_USAGE_LIMIT_EXCEEDED" as const;

  constructor(
    readonly scope: AiUsageLimitScope,
    readonly retryAfterSeconds: number,
  ) {
    super(`AI usage limit exceeded for ${scope}`);
    this.name = "AiUsageLimitExceededError";
  }

  toResponse(): AiUsageLimitError {
    return {
      code: this.code,
      scope: this.scope,
      retryAfterSeconds: this.retryAfterSeconds,
    };
  }
}

function utcMinuteStart(now: Date) {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      now.getUTCHours(),
      now.getUTCMinutes(),
    ),
  );
}

function utcDayStart(now: Date) {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
    ),
  );
}

function secondsUntil(windowEnd: Date, now: Date) {
  return Math.max(
    0,
    Math.ceil((windowEnd.getTime() - now.getTime()) / 1000),
  );
}

@Injectable()
export class AiUsageLimiter {
  constructor(
    @Inject(AI_USAGE_REPOSITORY)
    private readonly repository: AiUsageRepository,
    @Inject(AI_USAGE_CONFIG)
    private readonly config: AiUsageConfig,
  ) {}

  async reserve(clientIp: string, now = new Date()): Promise<void> {
    if (!this.config.enabled || this.config.provider === "mock") {
      return;
    }

    const minuteStart = utcMinuteStart(now);
    const dayStart = utcDayStart(now);

    const counters: AiUsageCounterReservation[] = [
      {
        scope: "global_day",
        subjectKey: "global",
        windowStart: dayStart,
        limit: this.config.globalDay,
      },
      {
        scope: "ip_day",
        subjectKey: clientIp,
        windowStart: dayStart,
        limit: this.config.perIpDay,
      },
      {
        scope: "ip_minute",
        subjectKey: clientIp,
        windowStart: minuteStart,
        limit: this.config.perIpMinute,
      },
    ];

    const result = await this.repository.reserve(counters);

    if (!result.allowed) {
      const windowEnd =
        result.scope === "ip_minute"
          ? new Date(minuteStart.getTime() + 60_000)
          : new Date(dayStart.getTime() + 86_400_000);

      throw new AiUsageLimitExceededError(
        result.scope,
        secondsUntil(windowEnd, now),
      );
    }
  }
}
