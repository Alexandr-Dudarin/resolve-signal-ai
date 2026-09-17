export function normalizeClientIp(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (normalized.startsWith("::ffff:")) {
    return normalized.slice("::ffff:".length);
  }

  return normalized === "::1" ? "127.0.0.1" : normalized;
}
