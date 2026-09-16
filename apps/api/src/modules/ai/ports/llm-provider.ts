import type {
  FeedbackAnalysis,
  FeedbackSource,
  PersistedFeedbackAnalysis,
} from "@resolve-signal/contracts";

export const LLM_PROVIDER = Symbol("LLM_PROVIDER");

export type LlmCallMetadata = {
  provider: string;
  model: string;
  promptVersion: string;
  inputTokens: number | null;
  outputTokens: number | null;
};

export type GeneratedReply = {
  tone: string;
  text: string;
};

export type GeneratedRepliesResult = {
  replies: GeneratedReply[];
  metadata: LlmCallMetadata;
};

export type AnalysisResult = FeedbackAnalysis & {
  metadata: LlmCallMetadata;
};

export type AnalyzeFeedbackInput = {
  id: string;
  source: FeedbackSource;
  rating: number | null;
  text: string;
};

export type GenerateRepliesFeedbackInput = AnalyzeFeedbackInput & {
  authorName: string | null;
};

export interface LLMProvider {
  analyzeFeedback(feedback: AnalyzeFeedbackInput): Promise<AnalysisResult>;

  generateReplies(
    feedback: GenerateRepliesFeedbackInput,
    analysis: PersistedFeedbackAnalysis,
    tones: string[],
  ): Promise<GeneratedRepliesResult>;
}
