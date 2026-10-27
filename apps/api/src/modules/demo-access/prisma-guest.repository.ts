import { Inject, Injectable } from "@nestjs/common";
import type { CreateFeedbackInput } from "@resolve-signal/contracts";
import { PrismaService } from "../../app/prisma.service.js";
import type { GuestCreationResult, GuestRecordPolicy, GuestRepository } from "./guest.repository.js";

@Injectable()
export class PrismaGuestRepository implements GuestRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  findSession(key: string) {
    return this.prisma.demoGuestSession.findFirst({
      where: { key, expiresAt: { gt: new Date() } }, select: { expiresAt: true },
    });
  }

  createSession(key: string, ttlSeconds: number, maximum: number) {
    return this.prisma.$transaction(async (tx) => {
      // Transaction-scoped locks serialize capacity checks across API instances.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(27102026, 1)`;
      const now = new Date();
      await tx.demoGuestSession.deleteMany({ where: { expiresAt: { lte: now } } });
      if (await tx.demoGuestSession.count() >= maximum) return null;
      return tx.demoGuestSession.create({
        data: { key, expiresAt: new Date(now.getTime() + ttlSeconds * 1000) },
        select: { expiresAt: true },
      });
    }, { isolationLevel: "ReadCommitted" });
  }

  async revokeSession(key: string) {
    await this.prisma.demoGuestSession.deleteMany({ where: { key } });
  }

  createFeedback(input: CreateFeedbackInput, ownerKey: string, policy: GuestRecordPolicy): Promise<GuestCreationResult> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(27102026, 2)`;
      const now = new Date();
      const session = await tx.demoGuestSession.findFirst({ where: { key: ownerKey, expiresAt: { gt: now } } });
      if (!session) return null;
      // Only records tagged by this guest creation path. All pre-existing rows
      // have NULL metadata; the migration CHECK also excludes the five examples.
      await tx.feedbackItem.deleteMany({
        where: { guestOwnerKey: { not: null }, guestExpiresAt: { lte: now } },
      });
      const owned = { guestOwnerKey: ownerKey };
      const all = { guestOwnerKey: { not: null } };
      const ownerFull = await tx.feedbackItem.count({ where: owned }) >= policy.perOwner;
      const globalFull = await tx.feedbackItem.count({ where: all }) >= policy.maximum;
      if (ownerFull || globalFull) {
        const earliest = await tx.feedbackItem.findFirst({
          where: ownerFull ? owned : all, orderBy: { guestExpiresAt: "asc" }, select: { guestExpiresAt: true },
        });
        return {
          scope: ownerFull ? "guest_owner_records" : "guest_records",
          retryAfterSeconds: Math.max(1, Math.ceil(((earliest?.guestExpiresAt?.getTime() ?? now.getTime() + 60000) - now.getTime()) / 1000)),
        };
      }
      return tx.feedbackItem.create({
        data: { ...input, guestOwnerKey: ownerKey, guestExpiresAt: new Date(now.getTime() + policy.retentionHours * 3600000) },
        select: { id: true },
      });
    }, { isolationLevel: "ReadCommitted" });
  }

  ownership(id: string) {
    return this.prisma.feedbackItem.findUnique({ where: { id }, select: { guestOwnerKey: true, guestExpiresAt: true } });
  }

  async replyFeedbackId(id: string) {
    const reply = await this.prisma.suggestedReply.findUnique({ where: { id }, select: { feedbackId: true } });
    return reply?.feedbackId ?? null;
  }

  async reserveAiOperation(id: string, ownerKey: string, maximum: number) {
    // Atomic per-record cap bounds both successful history and concurrent attempts.
    const result = await this.prisma.feedbackItem.updateMany({
      where: { id, guestOwnerKey: ownerKey, guestExpiresAt: { gt: new Date() }, guestAiOperations: { lt: maximum } },
      data: { guestAiOperations: { increment: 1 } },
    });
    return result.count === 1;
  }
}
