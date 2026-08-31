import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";
import { MockProvider } from "../modules/ai/infrastructure/mock.provider.js";
import { LLM_PROVIDER } from "../modules/ai/ports/llm-provider.js";
import { DashboardController } from "../modules/dashboard/api/dashboard.controller.js";
import { DashboardService } from "../modules/dashboard/api/dashboard.service.js";
import { FeedbackService } from "../modules/feedback/application/feedback.service.js";
import { FeedbackController } from "../modules/feedback/api/feedback.controller.js";
import { FEEDBACK_REPOSITORY } from "../modules/feedback/domain/feedback.repository.js";
import { PrismaFeedbackRepository } from "../modules/feedback/infrastructure/prisma-feedback.repository.js";
import { HealthController } from "../modules/health/health.controller.js";
import { RepliesController } from "../modules/replies/api/replies.controller.js";

@Module({
  controllers: [HealthController, DashboardController, FeedbackController, RepliesController],
  providers: [
    PrismaService,
    FeedbackService,
    DashboardService,
    { provide: FEEDBACK_REPOSITORY, useClass: PrismaFeedbackRepository },
    { provide: LLM_PROVIDER, useClass: MockProvider },
  ],
})
export class AppModule {}
