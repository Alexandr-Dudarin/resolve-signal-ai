export function createVercelConfig(env: NodeJS.ProcessEnv) {
  let origin: URL;
  try { origin = new URL(env.RENDER_API_ORIGIN ?? ""); } catch { throw new Error("Set RENDER_API_ORIGIN to the actual Render HTTPS service origin before deployment"); }
  if (origin.protocol !== "https:" || origin.origin !== env.RENDER_API_ORIGIN || !origin.hostname.endsWith(".onrender.com") || origin.port) {
    throw new Error("RENDER_API_ORIGIN must be the exact HTTPS onrender.com origin (no path, credentials or trailing slash)");
  }
  if (env.VITE_API_URL) throw new Error("VITE_API_URL must be empty for the same-origin demo proxy");
  return {
    framework: "vite",
    installCommand: "corepack pnpm install --frozen-lockfile --prod=false",
    buildCommand: "corepack pnpm contracts:build && corepack pnpm --filter @resolve-signal/web build",
    outputDirectory: "apps/web/dist",
    rewrites: [
      { source: "/api/:path*", destination: `${origin.origin}/api/:path*` },
      { source: "/:path*", destination: "/index.html" },
    ],
    headers: [
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
      { source: "/:path*", headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
        { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" },
      ] },
    ],
  };
}
