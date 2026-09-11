import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "@/lib/email/verifyWebhookSignature";

const SECRET = "whsec_dGVzdC1zZWNyZXQta2V5LWZvci11bml0LXRlc3Rz";
const PAYLOAD = '{"type":"email.bounced","data":{"to":"a@b.it"}}';
const ID = "msg_123";

function sign(
  payload: string,
  timestampSeconds: number,
  secret = SECRET,
  id = ID,
): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const digest = createHmac("sha256", key)
    .update(`${id}.${timestampSeconds}.${payload}`)
    .digest("base64");
  return `v1,${digest}`;
}

const NOW = 1_757_000_000_000;
const TS = Math.floor(NOW / 1000);

function headers(overrides: Partial<Record<string, string | null>> = {}) {
  return {
    id: ID,
    timestamp: String(TS),
    signature: sign(PAYLOAD, TS),
    ...overrides,
  };
}

describe("verifyWebhookSignature", () => {
  it("accepts a correctly signed payload", () => {
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        payload: PAYLOAD,
        headers: headers(),
        now: NOW,
      }),
    ).toBe(true);
  });

  it("rejects a tampered payload", () => {
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        payload: '{"type":"email.bounced","data":{"to":"attacker@evil.it"}}',
        headers: headers(),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        payload: PAYLOAD,
        headers: headers({
          signature: sign(PAYLOAD, TS, "whsec_d3Jvbmctc2VjcmV0LXZhbHVl"),
        }),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("rejects a replayed signature older than the tolerance", () => {
    const old = TS - 10 * 60;
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        payload: PAYLOAD,
        headers: {
          id: ID,
          timestamp: String(old),
          signature: sign(PAYLOAD, old),
        },
        now: NOW,
      }),
    ).toBe(false);
  });

  it("rejects a signature bound to a different message id", () => {
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        payload: PAYLOAD,
        headers: headers({ signature: sign(PAYLOAD, TS, SECRET, "msg_other") }),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("rejects missing headers instead of passing them through", () => {
    for (const missing of ["id", "timestamp", "signature"] as const) {
      expect(
        verifyWebhookSignature({
          secret: SECRET,
          payload: PAYLOAD,
          headers: headers({ [missing]: null }),
          now: NOW,
        }),
      ).toBe(false);
    }
  });

  it("rejects everything when no secret is configured", () => {
    expect(
      verifyWebhookSignature({
        secret: "",
        payload: PAYLOAD,
        headers: headers(),
        now: NOW,
      }),
    ).toBe(false);
  });

  it("accepts when one of several offered signatures matches", () => {
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        payload: PAYLOAD,
        headers: headers({
          signature: `v1,aW52YWxpZA== ${sign(PAYLOAD, TS)}`,
        }),
        now: NOW,
      }),
    ).toBe(true);
  });

  it("ignores signature versions it does not understand", () => {
    const digest = sign(PAYLOAD, TS).split(",")[1];
    expect(
      verifyWebhookSignature({
        secret: SECRET,
        payload: PAYLOAD,
        headers: headers({ signature: `v2,${digest}` }),
        now: NOW,
      }),
    ).toBe(false);
  });
});
