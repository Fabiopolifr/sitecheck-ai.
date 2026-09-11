import { beforeEach, describe, expect, it } from "vitest";
import {
  getLastOutreachRun,
  hoursSince,
  isRunStale,
  recordOutreachRun,
  STALE_RUN_HOURS,
} from "@/features/outreach/lastRun";
import { setSetting } from "@/lib/db/appSettingsRepository";

const EMPTY_SUMMARY = {
  manualProcessed: 30,
  discovered: 0,
  analyzed: 30,
  eligible: 12,
  emailed: 8,
  followedUp: 5,
  errors: 0,
};

describe("outreach last run tracking", () => {
  beforeEach(async () => {
    await setSetting("outreach_last_run", "");
  });

  it("records a completed run with its summary", async () => {
    await recordOutreachRun({ paused: false, summary: EMPTY_SUMMARY });

    const record = await getLastOutreachRun();
    expect(record?.paused).toBe(false);
    expect(record?.summary?.emailed).toBe(8);
    expect(typeof record?.at).toBe("string");
  });

  it("records a paused run too, so a live scheduler is distinguishable from a dead one", async () => {
    await recordOutreachRun({ paused: true, summary: null });

    const record = await getLastOutreachRun();
    expect(record?.paused).toBe(true);
    expect(record?.summary).toBeNull();
  });

  it("treats a malformed stored value as no run, instead of throwing", async () => {
    await setSetting("outreach_last_run", "{not json");
    expect(await getLastOutreachRun()).toBeNull();

    await setSetting("outreach_last_run", '{"unexpected":true}');
    expect(await getLastOutreachRun()).toBeNull();
  });
});

describe("isRunStale", () => {
  const now = Date.UTC(2026, 8, 11, 12, 0, 0);

  it("considers a never-run scheduler stale", () => {
    expect(isRunStale(null, now)).toBe(true);
  });

  it("considers a recent run healthy", () => {
    const at = new Date(now - 2 * 3600 * 1000).toISOString();
    expect(isRunStale({ at, paused: false, summary: null }, now)).toBe(false);
  });

  it(`considers a run older than ${STALE_RUN_HOURS}h stale`, () => {
    const at = new Date(
      now - (STALE_RUN_HOURS + 1) * 3600 * 1000,
    ).toISOString();
    expect(isRunStale({ at, paused: false, summary: null }, now)).toBe(true);
  });

  it("does not consider a paused-but-recent run stale: pausa e guasto sono diversi", () => {
    const at = new Date(now - 3600 * 1000).toISOString();
    expect(isRunStale({ at, paused: true, summary: null }, now)).toBe(false);
  });

  it("measures elapsed hours", () => {
    const at = new Date(now - 5 * 3600 * 1000).toISOString();
    expect(hoursSince(at, now)).toBeCloseTo(5, 5);
  });
});
