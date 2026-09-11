import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The route reads OUTREACH_SECRET through the validated env module, so
// the secret must exist before the module graph is imported.
vi.mock("@/lib/config/env", () => ({
  env: {
    OUTREACH_SECRET: "test-secret",
    APP_URL: "https://example.test",
  },
}));

const runOutreachBatch = vi.hoisted(() => vi.fn());
vi.mock("@/features/outreach/runOutreachBatch", () => ({ runOutreachBatch }));

import { POST } from "@/app/api/outreach/run/route";
import { setOutreachPaused } from "@/features/outreach/pause";

function request(body: unknown = {}, secret = "test-secret") {
  return new Request("https://example.test/api/outreach/run", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-outreach-secret": secret,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/outreach/run — pause flag", () => {
  beforeEach(async () => {
    runOutreachBatch.mockReset();
    runOutreachBatch.mockResolvedValue({
      manualProcessed: 0,
      discovered: 0,
      analyzed: 0,
      eligible: 0,
      emailed: 0,
      followedUp: 0,
      errors: 0,
    });
    await setOutreachPaused(false);
  });

  afterEach(async () => {
    await setOutreachPaused(false);
  });

  it("runs the batch when not paused", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(runOutreachBatch).toHaveBeenCalledOnce();
  });

  it("does NOT run the batch while paused", async () => {
    await setOutreachPaused(true);

    const response = await POST(request());
    const body = await response.json();

    expect(body).toEqual({ paused: true });
    expect(runOutreachBatch).not.toHaveBeenCalled();
  });

  it("resumes running the batch after unpausing", async () => {
    await setOutreachPaused(true);
    await POST(request());
    expect(runOutreachBatch).not.toHaveBeenCalled();

    await setOutreachPaused(false);
    await POST(request());
    expect(runOutreachBatch).toHaveBeenCalledOnce();
  });

  it("rejects an unauthorized caller regardless of pause state", async () => {
    const response = await POST(request({}, "wrong-secret"));
    expect(response.status).toBe(401);
    expect(runOutreachBatch).not.toHaveBeenCalled();
  });
});
