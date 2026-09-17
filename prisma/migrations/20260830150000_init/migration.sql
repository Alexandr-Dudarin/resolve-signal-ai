CREATE TYPE "FeedbackSource" AS ENUM ('manual', 'web_form', 'support', 'store_review', 'api');
CREATE TYPE "FeedbackStatus" AS ENUM ('new', 'triaged', 'in_progress', 'resolved', 'replied');
CREATE TYPE "Sentiment" AS ENUM ('positive', 'neutral', 'negative', 'mixed');
CREATE TYPE "Severity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "FeedbackCategory" AS ENUM ('product', 'service', 'delivery', 'payment', 'refund', 'support', 'account', 'other');
CREATE TYPE "ReplyStatus" AS ENUM ('draft', 'approved', 'rejected');

CREATE TABLE "feedback_items" (
  "id" UUID NOT NULL,
  "source" "FeedbackSource" NOT NULL,
  "external_id" VARCHAR(120),
  "rating" INTEGER,
  "text" VARCHAR(5000) NOT NULL,
  "author_name" VARCHAR(100),
  "customer_ref" VARCHAR(120),
  "status" "FeedbackStatus" NOT NULL DEFAULT 'new',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "feedback_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "feedback_analyses" (
  "id" UUID NOT NULL,
  "feedback_id" UUID NOT NULL,
  "sentiment" "Sentiment" NOT NULL,
  "severity" "Severity" NOT NULL,
  "category" "FeedbackCategory" NOT NULL,
  "summary" VARCHAR(1000) NOT NULL,
  "problems" JSONB NOT NULL,
  "provider" VARCHAR(80) NOT NULL,
  "model" VARCHAR(120) NOT NULL,
  "prompt_version" VARCHAR(40) NOT NULL,
  "input_tokens" INTEGER,
  "output_tokens" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feedback_analyses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "suggested_replies" (
  "id" UUID NOT NULL,
  "feedback_id" UUID NOT NULL,
  "analysis_id" UUID NOT NULL,
  "tone" VARCHAR(40),
  "text" VARCHAR(5000) NOT NULL,
  "status" "ReplyStatus" NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "suggested_replies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "feedback_items_status_created_at_idx" ON "feedback_items"("status", "created_at");
CREATE INDEX "feedback_items_source_created_at_idx" ON "feedback_items"("source", "created_at");
CREATE INDEX "feedback_analyses_feedback_id_created_at_idx" ON "feedback_analyses"("feedback_id", "created_at");
CREATE INDEX "feedback_analyses_severity_category_idx" ON "feedback_analyses"("severity", "category");
CREATE INDEX "suggested_replies_feedback_id_created_at_idx" ON "suggested_replies"("feedback_id", "created_at");

ALTER TABLE "feedback_analyses"
  ADD CONSTRAINT "feedback_analyses_feedback_id_fkey"
  FOREIGN KEY ("feedback_id") REFERENCES "feedback_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suggested_replies"
  ADD CONSTRAINT "suggested_replies_feedback_id_fkey"
  FOREIGN KEY ("feedback_id") REFERENCES "feedback_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "suggested_replies"
  ADD CONSTRAINT "suggested_replies_analysis_id_fkey"
  FOREIGN KEY ("analysis_id") REFERENCES "feedback_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

