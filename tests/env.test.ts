import { describe, expect, it } from "vitest";

describe("env config module", () => {
  it("loads without throwing when no env vars are set", async () => {
    await expect(import("@/lib/config/env")).resolves.toBeDefined();
  });
});
