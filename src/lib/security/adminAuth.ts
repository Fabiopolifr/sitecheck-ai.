import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/config/env";

export const ADMIN_SESSION_COOKIE = "sitecheck_admin_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function sign(payload: string): string {
  return createHmac("sha256", env.ADMIN_PASSWORD ?? "")
    .update(payload)
    .digest("hex");
}

/**
 * Single-admin MVP session token: `<issuedAt>.<hmac>`, signed with
 * ADMIN_PASSWORD as the HMAC key. Not a general-purpose auth system —
 * see AI/DECISIONS.md for why this replaces Supabase Auth in Phase 2.
 */
export function createAdminSessionToken(): string {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

export function isValidAdminSessionToken(token: string | undefined): boolean {
  if (!token || !env.ADMIN_PASSWORD) return false;

  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const expected = sign(issuedAt);
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(signature, "hex");
  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return false;
  }

  const age = Date.now() - Number(issuedAt);
  return age >= 0 && age <= SESSION_MAX_AGE_SECONDS * 1000;
}

export function verifyAdminPassword(candidate: string): boolean {
  if (!env.ADMIN_PASSWORD) return false;
  const expected = Buffer.from(env.ADMIN_PASSWORD);
  const actual = Buffer.from(candidate);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const adminSessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
