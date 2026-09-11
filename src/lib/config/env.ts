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

  /**
   * Secret del webhook Resend (`whsec_...`), usato per firmare gli
   * eventi di bounce e segnalazione spam. Senza questo,
   * POST /api/webhooks/resend risponde 404. Vedi AI/DECISIONS.md D53.
   */
  RESEND_WEBHOOK_SECRET: z.string().min(1).optional(),

  COOKIEYES_AFFILIATE_URL: z.string().url().optional(),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),

  /** Internal inbox notified when a visitor requests the €99 CookieYes assisted setup — see AI/DECISIONS.md. */
  SUPPORT_NOTIFICATION_EMAIL: z.string().email().optional(),

  APP_URL: z.string().url().optional(),

  CONTENT_GENERATION_SECRET: z.string().min(16).optional(),

  /** Google Places API (Text Search + Details) — powers automated lead discovery. See AI/DECISIONS.md D37. */
  GOOGLE_PLACES_API_KEY: z.string().min(1).optional(),
  /** Shared secret an external scheduler sends to trigger the daily outreach batch — same pattern as CONTENT_GENERATION_SECRET. */
  OUTREACH_SECRET: z.string().min(16).optional(),

  /**
   * Absolute path of the Phusion Passenger restart trigger file, used by
   * the "Riavvia il sito" button in /admin (AI/DECISIONS.md D45). Must
   * point through Hostinger's `current` symlink, not the versioned
   * directory, so the write lands in the build Passenger is watching.
   * Falls back to `<cwd>/tmp/restart.txt` when unset.
   */
  PASSENGER_RESTART_FILE: z.string().min(1).optional(),
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
