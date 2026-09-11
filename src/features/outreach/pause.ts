import { getSetting, setSetting } from "@/lib/db/appSettingsRepository";

const OUTREACH_PAUSED_KEY = "outreach_paused";

export async function isOutreachPaused(): Promise<boolean> {
  return (await getSetting(OUTREACH_PAUSED_KEY)) === "true";
}

export async function setOutreachPaused(paused: boolean): Promise<void> {
  await setSetting(OUTREACH_PAUSED_KEY, paused ? "true" : "false");
}
