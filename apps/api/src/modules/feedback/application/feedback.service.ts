import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CreateFeedbackInput,
  FeedbackListQuery,
  FeedbackStatus,
  UpdateReplyInput,
} from "@resolve-signal/contracts";
import { LLM_PROVIDER, type LLMProvider } from "../../ai/ports/llm-provider.js";
import { FEEDBACK_REPOSITORY, type FeedbackRepository } from "../domain/feedback.repository.js";

@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY) private readonly repository: FeedbackRepository,
    @Inject(LLM_PROVIDER) private readonly llmProvider: LLMProvider,
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

  async analyze(id: string) {
    const feedback = await this.get(id);
    const result = await this.llmProvider.analyzeFeedback({
      id: feedback.id,
      source: feedback.source,
      rating: feedback.rating,
      text: feedback.text,
    });
    return this.repository.saveAnalysis(id, result);
  }

  async generateReplies(id: string, tones: string[]) {
    let feedback = await this.get(id);
    let analysis = feedback.latestAnalysis;
    if (!analysis) {
      analysis = await this.analyze(id);
      feedback = await this.get(id);
    }
    const generated = await this.llmProvider.generateReplies(
      {
        id: feedback.id,
        source: feedback.source,
        rating: feedback.rating,
        text: feedback.text,
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
