import { Inject, Injectable } from "@nestjs/common";
import type { DashboardSummary, Sentiment, Severity } from "@resolve-signal/contracts";
import { FEEDBACK_REPOSITORY, type FeedbackRepository } from "../../feedback/domain/feedback.repository.js";

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
      recentFeedback: items.slice(0, 5),
    };
  }
}
