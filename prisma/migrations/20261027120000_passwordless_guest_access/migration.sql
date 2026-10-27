-- Additive only. Existing feedback remains unowned and read-only to guests.
ALTER TABLE "feedback_items"
  ADD COLUMN "guest_owner_key" VARCHAR(64),
  ADD COLUMN "guest_expires_at" TIMESTAMP(3),
  ADD COLUMN "guest_ai_operations" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "feedback_items" ADD CONSTRAINT "feedback_guest_metadata_check" CHECK (
  ("guest_owner_key" IS NULL AND "guest_expires_at" IS NULL AND "guest_ai_operations" = 0)
  OR ("guest_owner_key" IS NOT NULL AND "guest_owner_key" ~ '^[a-f0-9]{64}$' AND "guest_expires_at" IS NOT NULL
    AND "guest_ai_operations" >= 0
    AND "id" NOT IN (
      '90000000-0000-4000-8000-000000000001',
      '90000000-0000-4000-8000-000000000002',
      '90000000-0000-4000-8000-000000000003',
      '90000000-0000-4000-8000-000000000004',
      '90000000-0000-4000-8000-000000000005'
    ))
);

CREATE INDEX "feedback_items_guest_expires_at_idx" ON "feedback_items"("guest_expires_at");
CREATE INDEX "feedback_items_guest_owner_key_idx" ON "feedback_items"("guest_owner_key");

CREATE TABLE "demo_guest_sessions" (
  "key" VARCHAR(64) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "demo_guest_sessions_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "demo_guest_sessions_expires_at_idx" ON "demo_guest_sessions"("expires_at");
