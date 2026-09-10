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
 * Every field in envSchema is `.optional()` — there is no field the app
 * cannot run without a real value for — so a malformed *optional* field
 * (a stray space, a URL missing "https://", a hosting panel storing a
 * blank field as something other than an absent key) must never take
 * down the entire app at boot. Validate field by field: a field that
 * fails validation is dropped (treated as unset, with a warning),
 * instead of one bad field crashing every route via a single thrown
 * error at module load. This is what actually happened in production on
 * Hostinger with COOKIEYES_AFFILIATE_URL — see AI/DECISIONS.md.
 */
function loadEnv(): Env {
  const shape = envSchema.shape;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const raw = process.env[key];
    if (raw === undefined || raw === "") continue;

    const fieldResult = shape[key].safeParse(raw);
    if (fieldResult.success) {
      result[key] = fieldResult.data;
    } else {
      console.warn(
        `Ignoring invalid value for env var ${key}: ${fieldResult.error.issues.map((i) => i.message).join(", ")}`,
      );
    }
  }

  return result as Env;
}

export const env = loadEnv();
