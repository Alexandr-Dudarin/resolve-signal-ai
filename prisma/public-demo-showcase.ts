import { PrismaClient } from "@prisma/client";
import { requirePublicDemoDatabase } from "./demo-database-guard.js";
import { initializePublicDemoShowcase } from "./public-demo-showcase-data.js";

async function main() {
  // Separate explicit confirmation, direct Neon host and strict TLS are required.
  const directUrl = requirePublicDemoDatabase(process.env, "showcase");
  const prisma = new PrismaClient({ datasourceUrl: directUrl });
  try {
    const { created, unchanged } = await initializePublicDemoShowcase(prisma);
    console.log(`Prepared showcase: ${created} inserted, ${unchanged} unchanged. Existing data preserved.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("Showcase initialization failed. Check confirmation, exact database identity and fixture conflicts; database credentials are not logged.");
  process.exitCode = 1;
});
