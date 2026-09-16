-- AlterTable
ALTER TABLE "suggested_replies" ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "generation_id" UUID,
ADD COLUMN     "original_text" VARCHAR(5000);

-- CreateTable
CREATE TABLE "reply_generations" (
    "id" UUID NOT NULL,
    "feedback_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "model" VARCHAR(120) NOT NULL,
    "prompt_version" VARCHAR(40) NOT NULL,
    "input_tokens" INTEGER,
    "output_tokens" INTEGER,
    "superseded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reply_generations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reply_generations_feedback_id_created_at_idx" ON "reply_generations"("feedback_id", "created_at");

-- CreateIndex
CREATE INDEX "reply_generations_feedback_id_superseded_at_idx" ON "reply_generations"("feedback_id", "superseded_at");

-- CreateIndex
CREATE INDEX "suggested_replies_generation_id_idx" ON "suggested_replies"("generation_id");

-- AddForeignKey
ALTER TABLE "reply_generations" ADD CONSTRAINT "reply_generations_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "feedback_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reply_generations" ADD CONSTRAINT "reply_generations_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "feedback_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggested_replies" ADD CONSTRAINT "suggested_replies_generation_id_fkey" FOREIGN KEY ("generation_id") REFERENCES "reply_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
