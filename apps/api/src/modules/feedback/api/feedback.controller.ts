import { Body, Controller, Get, Inject, Param, Patch, Post, Query, Req, UseFilters } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import {
  CreateFeedbackSchema,
  EntityIdSchema,
  FeedbackListQuerySchema,
  GenerateRepliesSchema,
  UpdateFeedbackStatusSchema,
} from "@resolve-signal/contracts";
import { parseOrThrow } from "../../../common/validation/parse-or-throw.js";
import { normalizeClientIp } from "../../../common/http/client-ip.js";
import { normalizeCreateFeedbackInput } from "../../../common/security/feedback-text.js";
import { AiUsageLimitExceptionFilter } from "../../ai-usage/api/ai-usage-limit-exception.filter.js";
import { FeedbackService } from "../application/feedback.service.js";

type ClientRequest = {
  ip?: string;
};

const aiUsageLimitResponse = {
  status: 429,
  description: "AI quota exhausted; no provider call is made.",
  headers: { "Retry-After": { description: "Seconds until the UTC window resets", schema: { type: "integer" as const, minimum: 0 } } },
  schema: {
    type: "object" as const,
    required: ["code", "scope", "retryAfterSeconds"],
    properties: {
      code: { type: "string" as const, enum: ["AI_USAGE_LIMIT_EXCEEDED"] },
      scope: { type: "string" as const, enum: ["ip_minute", "ip_day", "global_day"] },
      retryAfterSeconds: { type: "integer" as const, minimum: 0 },
    },
  },
};

@ApiTags("feedback")
@Controller("api/v1/feedback")
@UseFilters(AiUsageLimitExceptionFilter)
export class FeedbackController {
  constructor(@Inject(FeedbackService) private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ summary: "Create feedback" })
  @ApiBody({
    schema: {
      type: "object",
      required: ["text"],
      properties: {
        source: { type: "string", example: "manual" },
        text: { type: "string", minLength: 5, maxLength: 5000 },
        rating: { type: "integer", minimum: 1, maximum: 5 },
        authorName: { type: "string" },
        customerRef: { type: "string" },
      },
    },
  })
  create(@Body() body: unknown) {
    return this.feedbackService.create(
      parseOrThrow(CreateFeedbackSchema, normalizeCreateFeedbackInput(body)),
    );
  }

  @Get()
  @ApiOperation({ summary: "List and filter feedback" })
  @ApiQuery({ name: "search", required: false })
  @ApiQuery({ name: "status", required: false })
  @ApiQuery({ name: "severity", required: false })
  @ApiQuery({ name: "category", required: false })
  @ApiQuery({ name: "source", required: false })
  list(@Query() query: Record<string, unknown>) {
    return this.feedbackService.list(parseOrThrow(FeedbackListQuerySchema, query));
  }

  @Get(":id")
  @ApiOperation({ summary: "Get feedback details" })
  @ApiParam({ name: "id", format: "uuid" })
  get(@Param("id") id: string) {
    return this.feedbackService.get(parseOrThrow(EntityIdSchema, id));
  }

  @Post(":id/analyze")
  @ApiOperation({ summary: "Analyze feedback with the configured LLM provider" })
  @ApiResponse(aiUsageLimitResponse)
  analyze(@Param("id") id: string, @Req() request: ClientRequest) {
    return this.feedbackService.analyze(
      parseOrThrow(EntityIdSchema, id),
      normalizeClientIp(request.ip ?? "unknown"),
    );
  }

  @Post(":id/replies")
  @ApiOperation({ summary: "Generate suggested replies" })
  @ApiResponse(aiUsageLimitResponse)
  @ApiBody({ schema: { type: "object", properties: { tones: { type: "array", items: { type: "string" } } } } })
  generateReplies(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: ClientRequest,
  ) {
    const input = parseOrThrow(GenerateRepliesSchema, body ?? {});
    return this.feedbackService.generateReplies(
      parseOrThrow(EntityIdSchema, id),
      input.tones,
      normalizeClientIp(request.ip ?? "unknown"),
    );
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update feedback status" })
  updateStatus(@Param("id") id: string, @Body() body: unknown) {
    const input = parseOrThrow(UpdateFeedbackStatusSchema, body);
    return this.feedbackService.updateStatus(parseOrThrow(EntityIdSchema, id), input.status);
  }
}
