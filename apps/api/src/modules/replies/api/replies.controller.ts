import { Body, Controller, Inject, Param, Patch } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { EntityIdSchema, UpdateReplySchema } from "@resolve-signal/contracts";
import { parseOrThrow } from "../../../common/validation/parse-or-throw.js";
import { FeedbackService } from "../../feedback/application/feedback.service.js";

@ApiTags("suggested replies")
@Controller("api/v1/replies")
export class RepliesController {
  constructor(@Inject(FeedbackService) private readonly feedbackService: FeedbackService) {}

  @Patch(":id")
  @ApiOperation({ summary: "Edit, approve, or reject a suggested reply" })
  update(@Param("id") id: string, @Body() body: unknown) {
    return this.feedbackService.updateReply(
      parseOrThrow(EntityIdSchema, id),
      parseOrThrow(UpdateReplySchema, body),
    );
  }
}
