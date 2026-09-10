import { describe, expect, it } from "vitest";
import { isGatedVariant } from "@/features/audit/abTest";

describe("isGatedVariant", () => {
  // Experiment paused (AI/DECISIONS.md D36) — low traffic made the 50/50
  // split meaningless and just hid the report for half of visitors.
  // Everyone gets the open/control variant until it's resumed.
  it("always returns the open/control variant while the experiment is paused", () => {
    expect(isGatedVariant()).toBe(false);
  });
});
