export type NormalizeUrlResult =
  { ok: true; url: URL } | { ok: false; error: string };

/**
 * Normalizes user-supplied input (with or without a scheme, with or without
 * "www.") into an absolute http(s) URL. Defaults to HTTPS when no scheme is
 * given. This does NOT perform SSRF validation — see
 * `src/lib/security/ssrf.ts` for that.
 */
export function normalizeUrl(input: string): NormalizeUrlResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return { ok: false, error: "URL is empty" };
  }

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { ok: false, error: "URL is not valid" };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https URLs are supported" };
  }

  url.hostname = url.hostname.toLowerCase();

  if (!url.hostname) {
    return { ok: false, error: "Hostname is not valid" };
  }

  return { ok: true, url };
}
