import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { CreateFeedbackSchema } from "@resolve-signal/contracts";
import type {
  CreateFeedbackInput,
  FeedbackListQuery,
  FeedbackStatus,
  UpdateReplyInput,
} from "@resolve-signal/contracts";
import { AiUsageLimiter } from "../../ai-usage/application/ai-usage-limiter.js";
import { normalizeFeedbackText } from "../../../common/security/feedback-text.js";
import { parseOrThrow } from "../../../common/validation/parse-or-throw.js";
import { LLM_PROVIDER, type LLMProvider } from "../../ai/ports/llm-provider.js";
import { FEEDBACK_REPOSITORY, type FeedbackRepository } from "../domain/feedback.repository.js";

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY) private readonly repository: FeedbackRepository,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LLMProvider,
    @Inject(AiUsageLimiter) private readonly aiUsageLimiter: AiUsageLimiter,
  ) {}

  create(input: CreateFeedbackInput) {
    return this.repository.create(input);
  }

  list(query: FeedbackListQuery) {
    return this.repository.list(query);
  }

  async get(id: string) {
    const feedback = await this.repository.findById(id);
    if (!feedback) throw new NotFoundException("Feedback not found");
    return feedback;
  }

  async analyze(id: string, clientIp: string) {
    const feedback = await this.get(id);
    const text = parseOrThrow(CreateFeedbackSchema.shape.text, normalizeFeedbackText(feedback.text));
    await this.aiUsageLimiter.reserve(clientIp);
    const result = await this.llmProvider.analyzeFeedback({
      id: feedback.id,
      source: feedback.source,
      rating: feedback.rating,
      text,
    });
    return this.repository.saveAnalysis(id, result);
  }

  async generateReplies(
    id: string,
    tones: string[],
    clientIp: string,
  ) {
    let feedback = await this.get(id);
    let text = parseOrThrow(CreateFeedbackSchema.shape.text, normalizeFeedbackText(feedback.text));
    let analysis = feedback.latestAnalysis;
    if (!analysis) {
      await this.aiUsageLimiter.reserve(clientIp);
      const analysisResult = await this.llmProvider.analyzeFeedback({
        id: feedback.id,
        source: feedback.source,
        rating: feedback.rating,
        text,
      });
      analysis = await this.repository.saveAnalysis(id, analysisResult);
      feedback = await this.get(id);
      text = parseOrThrow(CreateFeedbackSchema.shape.text, normalizeFeedbackText(feedback.text));
    }
    await this.aiUsageLimiter.reserve(clientIp);
    const generated = await this.llmProvider.generateReplies(
      {
        id: feedback.id,
        source: feedback.source,
        rating: feedback.rating,
        text,
        authorName: feedback.authorName,
      },
      analysis,
      tones,
    );
    return this.repository.saveReplies(id, analysis.id, generated);
  }

  async updateStatus(id: string, status: FeedbackStatus) {
    const feedback = await this.repository.updateStatus(id, status);
    if (!feedback) throw new NotFoundException("Feedback not found");
    return feedback;
  }

  async updateReply(id: string, input: UpdateReplyInput) {
    const reply = await this.repository.updateReply(id, input);
    if (!reply) throw new NotFoundException("Suggested reply not found");
    return reply;
  }
}
