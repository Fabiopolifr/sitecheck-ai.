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

/**
 * Hosting panels (Hostinger included) commonly declare every configured
 * env var key even when its value is left blank, producing "" rather
 * than an absent key. Every field above is `.optional()` — meaning
 * "absent is fine" — but Zod's `.optional()` only accepts `undefined`,
 * not an empty string, so a single blank optional field (e.g. an unused
 * COOKIEYES_AFFILIATE_URL) would otherwise fail `.url()`/`.email()`
 * validation and take down the entire app at boot. Treat blank strings
 * as unset before validating, so only genuinely malformed non-empty
 * values are rejected.
 */
function stripBlankValues(
  input: NodeJS.ProcessEnv,
): Record<string, string | undefined> {
  const result: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(input)) {
    result[key] = value === "" ? undefined : value;
  }
  return result;
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(stripBlankValues(process.env));

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
