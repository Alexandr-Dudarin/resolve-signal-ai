import { Inject, Injectable } from "@nestjs/common";
import type { DashboardSummary, FeedbackListItem, Sentiment, Severity } from "@resolve-signal/contracts";
import { FEEDBACK_REPOSITORY, type FeedbackRepository } from "../../feedback/domain/feedback.repository.js";

// Three stable, synthetic showcases created by the original local seed and
// the guarded public-demo showcase initializer. Guest submissions cannot evict them.
const PINNED_SHOWCASE_IDS = [
  "33333333-3333-4333-8333-333333333333", // Sofia: critical payment
  "22222222-2222-4222-8222-222222222222", // Dmitry: triaged delivery
  "11111111-1111-4111-8111-111111111111", // Anna: approved reply
] as const;

function selectDashboardFeedback(items: FeedbackListItem[]): FeedbackListItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const pinned = PINNED_SHOWCASE_IDS.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const pinnedIds = new Set(pinned.map((item) => item.id));
  const recent = items.filter((item) => !pinnedIds.has(item.id)).slice(0, 10 - pinned.length);
  return [...recent, ...pinned];
}

@Injectable()
export class DashboardService {
  constructor(@Inject(FEEDBACK_REPOSITORY) private readonly repository: FeedbackRepository) {}

  async summary(): Promise<DashboardSummary> {
    const { items, total } = await this.repository.allForDashboard();
    const countBy = <T extends string>(values: T[], keys: readonly T[]) =>
      keys.map((key) => ({ key, count: values.filter((value) => value === key).length }));
    const sentiments: Sentiment[] = items.flatMap((item) =>
      item.latestAnalysis ? [item.latestAnalysis.sentiment] : [],
    );
    const severities: Severity[] = items.flatMap((item) =>
      item.latestAnalysis ? [item.latestAnalysis.severity] : [],
    );

    return {
      total,
      negative: sentiments.filter((value) => value === "negative").length,
      critical: severities.filter((value) => value === "critical").length,
      awaitingReview: items.filter((item) => item.status === "new" || item.status === "triaged").length,
      analyzed: items.filter((item) => item.latestAnalysis).length,
      sentiment: countBy(sentiments, ["positive", "neutral", "negative", "mixed"]),
      severity: countBy(severities, ["low", "medium", "high", "critical"]),
      recentFeedback: selectDashboardFeedback(items),
    };
  }
}
