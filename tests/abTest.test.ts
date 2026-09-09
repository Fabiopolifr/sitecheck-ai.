import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { isGatedVariant } from "@/features/audit/abTest";

describe("isGatedVariant", () => {
  it("is deterministic for the same audit id", () => {
    const id = randomUUID();
    expect(isGatedVariant(id)).toBe(isGatedVariant(id));
  });

  it("splits a large sample roughly 50/50", () => {
    const sampleSize = 2000;
    let gatedCount = 0;
    for (let i = 0; i < sampleSize; i++) {
      if (isGatedVariant(randomUUID())) gatedCount++;
    }
    const ratio = gatedCount / sampleSize;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });
});
