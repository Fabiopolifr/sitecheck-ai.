const GENERIC_LOCAL_PARTS = [
  "info",
  "contatti",
  "contact",
  "hello",
  "commerciale",
  "segreteria",
  "amministrazione",
];

const JUNK_PATTERNS = [
  /\.(png|jpe?g|gif|svg|webp|css|js)$/i,
  /^(no-?reply|noreply|donotreply)@/i,
  /^(example|test|sentry|wixpress)@/i,
  /sentry\.io$/i,
  /wixpress\.com$/i,
];

function isPlausibleEmail(email: string): boolean {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  return !JUNK_PATTERNS.some((pattern) => pattern.test(email));
}

/**
 * Pulls a plausible contact email out of a fetched page's HTML: prefers
 * `mailto:` links (explicit author intent) over bare text matches, and
 * within those prefers a generic company alias (info@, contatti@...)
 * over a personal-looking one, since a cold outreach email should land
 * on a company inbox, not an individual's.
 */
export function extractContactEmail(
  html: string,
  hostname: string,
): string | null {
  const mailtoMatches = [...html.matchAll(/mailto:([^"'?\s]+)/gi)].map((m) =>
    decodeURIComponent(m[1]).toLowerCase(),
  );

  const bareMatches = [
    ...html.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi),
  ].map((m) => m[0].toLowerCase());

  const candidates = [...new Set([...mailtoMatches, ...bareMatches])].filter(
    isPlausibleEmail,
  );

  if (candidates.length === 0) return null;

  const bareDomain = hostname.replace(/^www\./, "");
  const sameDomain = candidates.filter((email) =>
    email.endsWith(`@${bareDomain}`),
  );
  const pool = sameDomain.length > 0 ? sameDomain : candidates;

  const generic = pool.find((email) =>
    GENERIC_LOCAL_PARTS.some((part) => email.startsWith(`${part}@`)),
  );

  return generic ?? pool[0];
}
