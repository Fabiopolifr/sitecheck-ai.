const globalForStore = globalThis as unknown as {
  __siteCheckAppSettings?: Map<string, string>;
};

const settings = globalForStore.__siteCheckAppSettings ?? new Map<string, string>();
globalForStore.__siteCheckAppSettings = settings;

export function getMemorySetting(key: string): string | null {
  return settings.get(key) ?? null;
}

export function setMemorySetting(key: string, value: string): void {
  settings.set(key, value);
}
