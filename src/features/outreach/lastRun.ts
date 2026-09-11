import { getSetting, setSetting } from "@/lib/db/appSettingsRepository";
import type { OutreachBatchSummary } from "./runOutreachBatch";

const LAST_RUN_KEY = "outreach_last_run";

/**
 * Il batch di outreach viene innescato da uno scheduler esterno
 * (cron-job.org): se smette di chiamare l'endpoint — account scaduto,
 * cronjob disattivato, errore di configurazione — l'automazione si
 * ferma e nulla lo segnala. Registrare ogni chiamata permette ad
 * /admin di accorgersene (AI/DECISIONS.md D52).
 */
export type OutreachRunRecord = {
  at: string;
  paused: boolean;
  summary: OutreachBatchSummary | null;
};

/** Oltre questa soglia il cronjob è considerato probabilmente fermo. */
export const STALE_RUN_HOURS = 36;

export async function recordOutreachRun(
  record: Omit<OutreachRunRecord, "at">,
): Promise<void> {
  const payload: OutreachRunRecord = {
    at: new Date().toISOString(),
    ...record,
  };
  await setSetting(LAST_RUN_KEY, JSON.stringify(payload));
}

export async function getLastOutreachRun(): Promise<OutreachRunRecord | null> {
  const raw = await getSetting(LAST_RUN_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as OutreachRunRecord;
    // Il valore arriva dal database: se è malformato vale come "nessuna
    // esecuzione registrata", non come un crash della pagina admin.
    return typeof parsed?.at === "string" ? parsed : null;
  } catch {
    return null;
  }
}

export function hoursSince(iso: string, now = Date.now()): number {
  return (now - new Date(iso).getTime()) / (1000 * 60 * 60);
}

export function isRunStale(
  record: OutreachRunRecord | null,
  now = Date.now(),
): boolean {
  if (!record) return true;
  return hoursSince(record.at, now) > STALE_RUN_HOURS;
}
