import { z } from "zod";

const WebEnvSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:4000"),
});

const parsed = WebEnvSchema.safeParse(import.meta.env);
if (!parsed.success) {
  throw new Error("Invalid web environment: VITE_API_URL must be a valid URL");
}

export const webEnv = parsed.data;
