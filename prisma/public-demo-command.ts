import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import { requirePublicDemoDatabase } from "./demo-database-guard.js";
import { initializePublicDemo } from "./public-demo-data.js";

async function main() {
  const action = process.argv[2];
  if (action !== "init" && action !== "migrate") throw new Error("Expected init or migrate");
  const directUrl = requirePublicDemoDatabase(process.env, action);
  if (action === "migrate") {
    // Resolve the installed Prisma CLI; no shell or URL command-line interpolation.
    const child = spawnSync(process.execPath, [fileURLToPath(import.meta.resolve("prisma/build/index.js")), "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: directUrl }, encoding: "utf8", stdio: "pipe",
    });
    // Prisma error output can include connection details. Intentionally do not relay it.
    if (child.status !== 0 || child.error) throw new Error("Migration failed; check the dedicated database configuration");
    console.log("Public demo migrations applied successfully.");
  } else {
    const prisma = new PrismaClient({ datasourceUrl: directUrl });
    try {
      const { count } = await initializePublicDemo(prisma);
      console.log(`Public demo initialized: ${count} synthetic records inserted. Existing data preserved.`);
    } finally { await prisma.$disconnect(); }
  }
}
main().catch(() => {
  console.error("Public demo command failed. Check confirmation, exact database identity and connectivity. No credentials are logged.");
  process.exitCode = 1;
});
