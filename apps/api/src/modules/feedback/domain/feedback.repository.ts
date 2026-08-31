import type {
  CreateFeedbackInput,
  FeedbackDetails,
  FeedbackListQuery,
  FeedbackListResponse,
  FeedbackStatus,
  PersistedFeedbackAnalysis,
  SuggestedReply,
  UpdateReplyInput,
} from "@resolve-signal/contracts";
import type { AnalysisResult, GeneratedReply } from "../../ai/ports/llm-provider.js";

export const FEEDBACK_REPOSITORY = Symbol("FEEDBACK_REPOSITORY");

export interface FeedbackRepository {
  create(input: CreateFeedbackInput): Promise<FeedbackDetails>;
  list(query: FeedbackListQuery): Promise<FeedbackListResponse>;
  findById(id: string): Promise<FeedbackDetails | null>;
  saveAnalysis(feedbackId: string, result: AnalysisResult): Promise<PersistedFeedbackAnalysis>;
  saveReplies(
    feedbackId: string,
    analysisId: string,
    replies: GeneratedReply[],
  ): Promise<SuggestedReply[]>;
  updateStatus(id: string, status: FeedbackStatus): Promise<FeedbackDetails | null>;
  updateReply(id: string, input: UpdateReplyInput): Promise<SuggestedReply | null>;
  allForDashboard(): Promise<FeedbackListResponse>;
}
