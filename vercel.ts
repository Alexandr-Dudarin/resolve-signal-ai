import { createVercelConfig } from "./deployment/vercel-config.js";
// Evaluated by Vercel at deployment time, after the actual Render URL is known.
export const config = createVercelConfig(process.env);
