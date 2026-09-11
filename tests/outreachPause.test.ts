import { beforeEach, describe, expect, it } from "vitest";
import { isOutreachPaused, setOutreachPaused } from "@/features/outreach/pause";

describe("outreach pause flag", () => {
  beforeEach(async () => {
    await setOutreachPaused(false);
  });

  it("defaults to not paused", async () => {
    expect(await isOutreachPaused()).toBe(false);
  });

  it("persists a pause and can be resumed", async () => {
    await setOutreachPaused(true);
    expect(await isOutreachPaused()).toBe(true);

    await setOutreachPaused(false);
    expect(await isOutreachPaused()).toBe(false);
  });
});
