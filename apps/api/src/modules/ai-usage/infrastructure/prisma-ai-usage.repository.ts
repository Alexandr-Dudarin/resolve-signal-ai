import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";

import { PrismaService } from "../../../app/prisma.service.js";
import type {
  AiUsageCounterReservation,
  AiUsageRepository,
  AiUsageReservationResult,
} from "../domain/ai-usage.repository.js";

class CounterLimitReachedError extends Error {
  constructor(readonly scope: AiUsageCounterReservation["scope"]) {
    super(`AI usage counter limit reached for ${scope}`);
  }
}

@Injectable()
export class PrismaAiUsageRepository implements AiUsageRepository {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaService,
  ) {}

  async reserve(
    counters: AiUsageCounterReservation[],
  ): Promise<AiUsageReservationResult> {
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const counter of counters) {
          const rows = await tx.$queryRaw<Array<{ count: number }>>`
            INSERT INTO "ai_usage_counters" (
              "id",
              "scope",
              "subject_key",
              "window_start",
              "count",
              "created_at",
              "updated_at"
            )
            VALUES (
              ${randomUUID()}::uuid,
              CAST(${counter.scope} AS "AiUsageScope"),
              ${counter.subjectKey},
              ${counter.windowStart},
              1,
              CURRENT_TIMESTAMP,
              CURRENT_TIMESTAMP
            )
            ON CONFLICT ("scope", "subject_key", "window_start")
            DO UPDATE SET
              "count" = "ai_usage_counters"."count" + 1,
              "updated_at" = CURRENT_TIMESTAMP
            WHERE "ai_usage_counters"."count" < ${counter.limit}
            RETURNING "count"
          `;

          if (rows.length === 0) {
            throw new CounterLimitReachedError(counter.scope);
          }
        }
      });

      return { allowed: true };
    } catch (error) {
      if (error instanceof CounterLimitReachedError) {
        return { allowed: false, scope: error.scope };
      }

      throw error;
    }
  }
}
