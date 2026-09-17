-- CreateEnum
CREATE TYPE "AiUsageScope" AS ENUM ('ip_minute', 'ip_day', 'global_day');

-- CreateTable
CREATE TABLE "ai_usage_counters" (
    "id" UUID NOT NULL,
    "scope" "AiUsageScope" NOT NULL,
    "subject_key" VARCHAR(64) NOT NULL,
    "window_start" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_usage_counters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_usage_counters_window_start_idx" ON "ai_usage_counters"("window_start");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_counters_scope_subject_key_window_start_key" ON "ai_usage_counters"("scope", "subject_key", "window_start");
