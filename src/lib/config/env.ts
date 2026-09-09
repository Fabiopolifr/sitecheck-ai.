import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).optional(),

  AI_PROVIDER: z.string().min(1).optional(),
  AI_API_KEY: z.string().min(1).optional(),
  AI_MODEL: z.string().min(1).optional(),

  PAGESPEED_API_KEY: z.string().min(1).optional(),

  EMAIL_PROVIDER: z.string().min(1).optional(),
  EMAIL_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().optional(),

  COOKIEYES_AFFILIATE_URL: z.string().url().optional(),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  APP_URL: z.string().url().optional(),

  CONTENT_GENERATION_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = loadEnv();
