import { afterEach, describe, expect, it, vi } from "vitest";

describe("env config module", () => {
  it("loads without throwing when no env vars are set", async () => {
    await expect(import("@/lib/config/env")).resolves.toBeDefined();
  });

  describe("blank optional env vars", () => {
    const originalValue = process.env.COOKIEYES_AFFILIATE_URL;

    afterEach(() => {
      process.env.COOKIEYES_AFFILIATE_URL = originalValue;
      vi.resetModules();
    });

    it("treats an empty string as unset instead of an invalid URL", async () => {
      // Hosting panels commonly declare every configured key even when
      // left blank ("" rather than an absent key) — this must not crash
      // the whole app at boot for an optional field (see env.ts).
      process.env.COOKIEYES_AFFILIATE_URL = "";
      vi.resetModules();

      const { env } = await import("@/lib/config/env");
      expect(env.COOKIEYES_AFFILIATE_URL).toBeUndefined();
    });

    it("still rejects a genuinely malformed non-empty URL", async () => {
      process.env.COOKIEYES_AFFILIATE_URL = "not-a-url";
      vi.resetModules();

      await expect(import("@/lib/config/env")).rejects.toThrow();
    });
  });
});
