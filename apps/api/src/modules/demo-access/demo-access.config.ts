import { SetMetadata } from "@nestjs/common";
import type { IncomingMessage } from "node:http";

export const DEMO_CONFIG = Symbol("DEMO_CONFIG");
export const DEMO_PUBLIC = Symbol("DEMO_PUBLIC");
export const DEMO_CREATE = Symbol("DEMO_CREATE");
export const PublicDemoEndpoint = () => SetMetadata(DEMO_PUBLIC, true);
export const DemoCreation = () => SetMetadata(DEMO_CREATE, true);
export type DemoRequest = IncomingMessage & { ip?: string };
