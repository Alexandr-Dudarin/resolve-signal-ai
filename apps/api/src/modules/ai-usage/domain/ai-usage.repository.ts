import type { AiUsageLimitScope } from "@resolve-signal/contracts";

export const AI_USAGE_REPOSITORY = Symbol("AI_USAGE_REPOSITORY");

export type AiUsageCounterReservation = {
  scope: AiUsageLimitScope;
  subjectKey: string;
  windowStart: Date;
  limit: number;
};

export type AiUsageReservationResult =
  | { allowed: true }
  | { allowed: false; scope: AiUsageLimitScope };

export interface AiUsageRepository {
  reserve(
    counters: AiUsageCounterReservation[],
  ): Promise<AiUsageReservationResult>;
}
