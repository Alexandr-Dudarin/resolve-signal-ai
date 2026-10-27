export function parseWebEnv(source: { VITE_API_URL?: string; PROD?: boolean }) {
  const value = source.VITE_API_URL ?? "";
  if (source.PROD && value !== "") throw new Error("Production VITE_API_URL must be empty: use the same-origin API proxy");
  if (value !== "") {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("VITE_API_URL must be empty or an HTTP(S) origin"); }
    if (!["http:", "https:"].includes(url.protocol) || url.origin !== value) throw new Error("VITE_API_URL must be an exact HTTP(S) origin");
  }
  return { VITE_API_URL: value };
}
