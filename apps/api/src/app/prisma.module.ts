import { Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service.js";

// One client/pool shared by business persistence and guest access persistence.
@Module({ providers: [PrismaService], exports: [PrismaService] })
export class PrismaModule {}
