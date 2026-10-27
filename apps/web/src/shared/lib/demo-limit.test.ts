import { describe, expect, it } from "vitest";
import { demoLimitMessage } from "./demo-limit";

describe("guest demo error messages", () => {
  it.each([
    ["read_global", "Слишком много запросов"], ["guest_records", "нет места"],
    ["guest_owner_records", "лимита обращений"], ["guest_ai_record", "лимит AI-операций"],
    ["guest_session_ip", "гостевых сеансов"],
  ])("explains %s in Russian", (scope, message) => {
    expect(demoLimitMessage({ demoLimit: { code: "DEMO_RATE_LIMIT_EXCEEDED", scope, retryAfterSeconds: 60 } })).toContain(message);
  });
  it("explains a read-only denial without suggesting an AI retry", () => {
    expect(demoLimitMessage({ demoReadOnly: true })).toContain("только для чтения");
  });
});
