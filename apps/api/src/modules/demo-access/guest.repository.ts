import type { CreateFeedbackInput } from "@resolve-signal/contracts";

export const GUEST_REPOSITORY = Symbol("GUEST_REPOSITORY");
export type GuestOwnership = { guestOwnerKey: string | null; guestExpiresAt: Date | null };
export type GuestRecordPolicy = { maximum: number; perOwner: number; retentionHours: number };
export type GuestCreationResult = { id: string } | {
  scope: "guest_records" | "guest_owner_records";
  retryAfterSeconds: number;
} | null;

export interface GuestRepository {
  findSession(key: string): Promise<{ expiresAt: Date } | null>;
  createSession(key: string, ttlSeconds: number, maximum: number): Promise<{ expiresAt: Date } | null>;
  revokeSession(key: string): Promise<void>;
  createFeedback(input: CreateFeedbackInput, ownerKey: string, policy: GuestRecordPolicy): Promise<GuestCreationResult>;
  ownership(id: string): Promise<GuestOwnership | null>;
  replyFeedbackId(id: string): Promise<string | null>;
  reserveAiOperation(id: string, ownerKey: string, maximum: number): Promise<boolean>;
}
