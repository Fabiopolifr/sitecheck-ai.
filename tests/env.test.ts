import { afterEach, describe, expect, it, vi } from "vitest";

describe("env config module", () => {
  it("loads without throwing when no env vars are set", async () => {
    await expect(import("@/lib/config/env")).resolves.toBeDefined();
  });

  describe("malformed optional env vars", () => {
    const originalValue = process.env.COOKIEYES_AFFILIATE_URL;

    afterEach(() => {
      process.env.COOKIEYES_AFFILIATE_URL = originalValue;
      vi.resetModules();
    });

    it("treats an empty string as unset", async () => {
      // Hosting panels commonly declare every configured key even when
      // left blank ("" rather than an absent key).
      process.env.COOKIEYES_AFFILIATE_URL = "";
      vi.resetModules();

      const { env } = await import("@/lib/config/env");
      expect(env.COOKIEYES_AFFILIATE_URL).toBeUndefined();
    });

    it("drops a genuinely malformed non-empty value instead of crashing", async () => {
      // A single bad optional field (e.g. a URL missing "https://") must
      // never take the whole app down at boot — see env.ts and
      // AI/DECISIONS.md for the production incident this reproduces.
      process.env.COOKIEYES_AFFILIATE_URL = "not-a-url";
      vi.resetModules();

      const { env } = await import("@/lib/config/env");
      expect(env.COOKIEYES_AFFILIATE_URL).toBeUndefined();
    });
  });
});
