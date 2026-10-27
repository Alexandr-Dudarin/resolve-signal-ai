import { SetMetadata } from "@nestjs/common";
import type { IncomingMessage } from "node:http";

export const DEMO_CONFIG = Symbol("DEMO_CONFIG");
export const DEMO_PUBLIC = Symbol("DEMO_PUBLIC");
export const DEMO_CREATE = Symbol("DEMO_CREATE");
export const DEMO_GUEST_READ = Symbol("DEMO_GUEST_READ");
export const DEMO_GUEST_WRITE = Symbol("DEMO_GUEST_WRITE");
export const PublicDemoEndpoint = () => SetMetadata(DEMO_PUBLIC, true);
export const DemoCreation = () => SetMetadata(DEMO_CREATE, true);
export const GuestReadable = () => SetMetadata(DEMO_GUEST_READ, true);
export const GuestWritable = () => SetMetadata(DEMO_GUEST_WRITE, true);
export type GuestActor = { ownerKey: string | null };
export type DemoRequest = IncomingMessage & { ip?: string; guestActor?: GuestActor };
