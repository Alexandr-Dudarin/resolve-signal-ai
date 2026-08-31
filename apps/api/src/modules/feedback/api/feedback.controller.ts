import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import {
  CreateFeedbackSchema,
  EntityIdSchema,
  FeedbackListQuerySchema,
  GenerateRepliesSchema,
  UpdateFeedbackStatusSchema,
} from "@resolve-signal/contracts";
import { parseOrThrow } from "../../../common/validation/parse-or-throw.js";
import { FeedbackService } from "../application/feedback.service.js";

@ApiTags("feedback")
@Controller("api/v1/feedback")
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
    return this.feedbackService.create(parseOrThrow(CreateFeedbackSchema, body));
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
  analyze(@Param("id") id: string) {
    return this.feedbackService.analyze(parseOrThrow(EntityIdSchema, id));
  }

  @Post(":id/replies")
  @ApiOperation({ summary: "Generate suggested replies" })
  @ApiBody({ schema: { type: "object", properties: { tones: { type: "array", items: { type: "string" } } } } })
  generateReplies(@Param("id") id: string, @Body() body: unknown) {
    const input = parseOrThrow(GenerateRepliesSchema, body ?? {});
    return this.feedbackService.generateReplies(parseOrThrow(EntityIdSchema, id), input.tones);
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Update feedback status" })
  updateStatus(@Param("id") id: string, @Body() body: unknown) {
    const input = parseOrThrow(UpdateFeedbackStatusSchema, body);
    return this.feedbackService.updateStatus(parseOrThrow(EntityIdSchema, id), input.status);
  }
}
