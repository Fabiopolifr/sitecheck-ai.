import { isIP } from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";

export class SsrfBlockedError extends Error {
  constructor(reason: string) {
    super(`Blocked by SSRF guard: ${reason}`);
    this.name = "SsrfBlockedError";
  }
}

const BLOCKED_HOSTNAME_SUFFIXES = [".local", ".internal", ".localhost"];
const BLOCKED_HOSTNAMES = new Set(["localhost", "0.0.0.0"]);

/**
 * Rejects obviously unsafe hostnames before any DNS lookup happens, as a
 * cheap first line of defense. The authoritative check is the resolved-IP
 * validation in {@link assertPublicAddresses}.
 */
export function assertSafeHostname(hostname: string): void {
  const normalized = hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(normalized)) {
    throw new SsrfBlockedError(`hostname "${hostname}" is not allowed`);
  }

  if (BLOCKED_HOSTNAME_SUFFIXES.some((suffix) => normalized.endsWith(suffix))) {
    throw new SsrfBlockedError(`hostname "${hostname}" is not allowed`);
  }
}

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0);
}

function inIpv4Range(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

const BLOCKED_IPV4_RANGES = [
  "0.0.0.0/8", // "this" network
  "10.0.0.0/8", // RFC1918
  "100.64.0.0/10", // CGNAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local
  "172.16.0.0/12", // RFC1918
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1 (documentation)
  "192.168.0.0/16", // RFC1918
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // TEST-NET-2 (documentation)
  "203.0.113.0/24", // TEST-NET-3 (documentation)
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved
  "255.255.255.255/32", // broadcast
];

function isBlockedIpv4(ip: string): boolean {
  return BLOCKED_IPV4_RANGES.some((cidr) => inIpv4Range(ip, cidr));
}

function isBlockedIpv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  if (normalized === "::1" || normalized === "::") {
    return true;
  }

  // IPv4-mapped / IPv4-compatible IPv6 addresses: validate the embedded IPv4.
  const mappedMatch = normalized.match(
    /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/,
  );
  if (mappedMatch) {
    return isBlockedIpv4(mappedMatch[1]);
  }

  // Unique local addresses (fc00::/7) and link-local (fe80::/10).
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) {
    return true;
  }
  if (/^fe[89ab][0-9a-f]:/.test(normalized)) {
    return true;
  }
  // Multicast.
  if (normalized.startsWith("ff")) {
    return true;
  }

  return false;
}

export function isBlockedIpAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) return isBlockedIpv4(ip);
  if (family === 6) return isBlockedIpv6(ip);
  // Not a valid literal IP: treat as unsafe rather than silently allowing it.
  return true;
}

export type ResolvedAddress = { address: string; family: number };

/**
 * Resolves a hostname and rejects it outright if ANY of its addresses fall
 * in a private/reserved/loopback/link-local range. Callers should pin their
 * outgoing connection to the addresses returned here (rather than trusting a
 * second DNS lookup at connect time) to avoid a DNS-rebinding TOCTOU gap.
 */
export async function resolveSafeAddresses(
  hostname: string,
): Promise<ResolvedAddress[]> {
  assertSafeHostname(hostname);

  // A literal IP in the URL host: validate it directly, no DNS involved.
  const literalFamily = isIP(hostname);
  if (literalFamily) {
    if (isBlockedIpAddress(hostname)) {
      throw new SsrfBlockedError(`IP address "${hostname}" is not allowed`);
    }
    return [{ address: hostname, family: literalFamily }];
  }

  let addresses: ResolvedAddress[];
  try {
    addresses = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new SsrfBlockedError(`could not resolve hostname "${hostname}"`);
  }

  if (addresses.length === 0) {
    throw new SsrfBlockedError(`hostname "${hostname}" resolved to nothing`);
  }

  if (addresses.some((a) => isBlockedIpAddress(a.address))) {
    throw new SsrfBlockedError(
      `hostname "${hostname}" resolves to a disallowed address`,
    );
  }

  return addresses;
}

export function assertAllowedProtocol(protocol: string): void {
  if (protocol !== "http:" && protocol !== "https:") {
    throw new SsrfBlockedError(`protocol "${protocol}" is not allowed`);
  }
}
