import { Module } from "@nestjs/common";

import { getApiEnv } from "./env.js";
import { PrismaService } from "./prisma.service.js";
import { createLlmProvider } from "../modules/ai/infrastructure/llm-provider.factory.js";
import { LLM_PROVIDER } from "../modules/ai/ports/llm-provider.js";
import { AiRuntimeController } from "../modules/ai/api/ai-runtime.controller.js";
import {
  AI_RUNTIME_STATUS,
  createAiRuntimeStatus,
} from "../modules/ai/application/ai-runtime-status.js";
import { DashboardController } from "../modules/dashboard/api/dashboard.controller.js";
import { DashboardService } from "../modules/dashboard/api/dashboard.service.js";
import { FeedbackController } from "../modules/feedback/api/feedback.controller.js";
import { FeedbackService } from "../modules/feedback/application/feedback.service.js";
import { FEEDBACK_REPOSITORY } from "../modules/feedback/domain/feedback.repository.js";
import { PrismaFeedbackRepository } from "../modules/feedback/infrastructure/prisma-feedback.repository.js";
import { HealthController } from "../modules/health/health.controller.js";
import { RepliesController } from "../modules/replies/api/replies.controller.js";

const llmProvider = {
  provide: LLM_PROVIDER,
  useFactory: () => createLlmProvider(getApiEnv()),
};

const aiRuntimeStatus = {
  provide: AI_RUNTIME_STATUS,
  useFactory: () => createAiRuntimeStatus(getApiEnv()),
};

@Module({
  controllers: [
    HealthController,
    AiRuntimeController,
    DashboardController,
    FeedbackController,
    RepliesController,
  ],
  providers: [
    PrismaService,
    FeedbackService,
    DashboardService,
    { provide: FEEDBACK_REPOSITORY, useClass: PrismaFeedbackRepository },
    llmProvider,
    aiRuntimeStatus,
  ],
})
export class AppModule {}
