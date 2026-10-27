import { HttpException, Inject, Injectable } from "@nestjs/common";
import type { DemoRateLimitError } from "@resolve-signal/contracts";
import type { ApiEnv } from "../../app/env.js";
import { DEMO_CONFIG } from "./demo-access.config.js";

export class DemoRateLimitErrorException extends HttpException {
  constructor(scope: DemoRateLimitError["scope"], retryAfterSeconds: number) {
    super({ code: "DEMO_RATE_LIMIT_EXCEEDED", scope, retryAfterSeconds }, 429);
  }
}

type Bucket = { count: number; end: number };

// One process only. Global bounds also bound per-IP map growth; no unsafe eviction.
@Injectable()
export class DemoRateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  constructor(@Inject(DEMO_CONFIG) private readonly config: ApiEnv) {}

  reserve(kind: "login" | "write", ip: string, creation = false, now = Date.now()) {
    for (const [key, bucket] of this.buckets) if (bucket.end <= now) this.buckets.delete(key);
    const rules: [DemoRateLimitError["scope"], string, number, number][] = kind === "login"
      ? [["login_global", "global", this.config.DEMO_LOGIN_GLOBAL, 900000], ["login_ip", ip, this.config.DEMO_LOGIN_PER_IP, 900000]]
      : [["write_global", "global", this.config.DEMO_WRITE_GLOBAL_MINUTE, 60000], ["write_ip", ip, this.config.DEMO_WRITE_PER_IP_MINUTE, 60000]];
    if (creation) rules.push(["create_global", "global", this.config.DEMO_CREATE_GLOBAL_DAY, 86400000]);
    const reservations = rules.map(([scope, subject, limit, window]) => {
      const key = `${scope}:${subject}`;
      const bucket = this.buckets.get(key) ?? { count: 0, end: (Math.floor(now / window) + 1) * window };
      if (bucket.count >= limit) throw new DemoRateLimitErrorException(scope, Math.ceil((bucket.end - now) / 1000));
      return { key, bucket };
    });
    // Synchronous check + increment: no partial charge if one scope rejects.
    for (const { key, bucket } of reservations) this.buckets.set(key, { ...bucket, count: bucket.count + 1 });
  }
}
