import { describe, expect, it } from "vitest";

import { normalizeClientIp } from "./client-ip.js";

describe("normalizeClientIp", () => {
  it("treats IPv4-mapped IPv6 and IPv4 as the same client", () => {
    expect(normalizeClientIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(normalizeClientIp("127.0.0.1")).toBe("127.0.0.1");
  });

  it("normalizes the IPv6 loopback address", () => {
    expect(normalizeClientIp("::1")).toBe("127.0.0.1");
  });
});
