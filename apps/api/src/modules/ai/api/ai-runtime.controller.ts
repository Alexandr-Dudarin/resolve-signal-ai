import { Controller, Get, Inject } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { AiRuntimeStatus } from "@resolve-signal/contracts";

import { AI_RUNTIME_STATUS } from "../application/ai-runtime-status.js";

@ApiTags("ai")
@Controller("api/v1/ai")
export class AiRuntimeController {
  constructor(
    @Inject(AI_RUNTIME_STATUS)
    private readonly runtimeStatus: AiRuntimeStatus,
  ) {}

  @Get("runtime-status")
  @ApiOperation({ summary: "Get safe active AI provider status" })
  getRuntimeStatus(): AiRuntimeStatus {
    return this.runtimeStatus;
  }
}
