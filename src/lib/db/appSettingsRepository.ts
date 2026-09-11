import { getPool, isDatabaseConfigured } from "./pgClient";
import {
  getMemorySetting,
  setMemorySetting,
} from "./memoryAppSettingsStore";

export async function getSetting(key: string): Promise<string | null> {
  if (!isDatabaseConfigured()) {
    return getMemorySetting(key);
  }

  const pool = getPool()!;

  try {
    const result = await pool.query(
      "select value from app_settings where key = $1",
      [key],
    );
    return result.rows[0]?.value ?? null;
  } catch (error) {
    console.error("Failed to read app setting from Postgres:", error);
    return getMemorySetting(key);
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  setMemorySetting(key, value);

  if (!isDatabaseConfigured()) {
    return;
  }

  const pool = getPool()!;

  try {
    await pool.query(
      `insert into app_settings (key, value, updated_at)
       values ($1, $2, now())
       on conflict (key) do update set value = excluded.value, updated_at = now()`,
      [key, value],
    );
  } catch (error) {
    console.error("Failed to persist app setting to Postgres:", error);
  }
}
