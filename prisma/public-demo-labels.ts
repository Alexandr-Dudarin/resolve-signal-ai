import { PrismaClient } from "@prisma/client";
import { requirePublicDemoDatabase } from "./demo-database-guard.js";
import { refreshPublicDemoFixtureMetadata } from "./public-demo-fixture-metadata.js";

async function main() {
  // Exact Neon direct host/database, strict TLS and separate manual confirmation.
  const directUrl = requirePublicDemoDatabase(process.env, "labels");
  const prisma = new PrismaClient({ datasourceUrl: directUrl });
  try {
    const result = await refreshPublicDemoFixtureMetadata(prisma);
    console.log(`Demo fixture labels verified: ${result.updated} updated, ${result.unchanged} unchanged.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  // Keep database URLs, passwords, and raw Prisma failures out of output.
  console.error("Fixture metadata refresh failed. Review exact database, confirmation, and fixture preconditions; no partial updates committed.");
  process.exitCode = 1;
});
