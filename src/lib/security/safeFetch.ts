import { Agent, fetch as undiciFetch } from "undici";
import {
  assertAllowedProtocol,
  assertSafeHostname,
  resolveSafeAddresses,
  SsrfBlockedError,
} from "./ssrf";

export type SafeFetchOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
};

export type SafeFetchSuccess = {
  ok: true;
  status: number;
  finalUrl: string;
  contentType: string | null;
  html: string;
  truncated: boolean;
  elapsedMs: number;
};

export type SafeFetchFailure = {
  ok: false;
  reason:
    | "invalid_url"
    | "blocked"
    | "timeout"
    | "too_many_redirects"
    | "network_error"
    | "non_success_status";
  message: string;
  status?: number;
};

export type SafeFetchResult = SafeFetchSuccess | SafeFetchFailure;

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_BYTES = 2_000_000;
const DEFAULT_MAX_REDIRECTS = 5;

/**
 * Fetches a URL while defending against SSRF: every hop (including
 * redirects) is validated against the SSRF guard and pinned, at the socket
 * level, to the exact IP addresses that were validated — so a DNS answer
 * that changes between validation and connection (DNS rebinding) can't
 * bypass the check. Enforces an overall timeout and a response size cap.
 */
export async function safeFetch(
  targetUrl: URL,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;

  let currentUrl = targetUrl;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      return { ok: false, reason: "timeout", message: "Request timed out" };
    }

    let addresses;
    try {
      assertAllowedProtocol(currentUrl.protocol);
      assertSafeHostname(currentUrl.hostname);
      addresses = await resolveSafeAddresses(currentUrl.hostname);
    } catch (error) {
      if (error instanceof SsrfBlockedError) {
        return { ok: false, reason: "blocked", message: error.message };
      }
      return {
        ok: false,
        reason: "blocked",
        message: "Could not validate destination address",
      };
    }

    const pinnedAddress = addresses[0].address;
    const pinnedFamily = addresses[0].family;
    const agent = new Agent({
      connect: {
        lookup: (_hostname, opts, callback) => {
          if (opts && typeof opts === "object" && "all" in opts && opts.all) {
            callback(null, [{ address: pinnedAddress, family: pinnedFamily }]);
          } else {
            callback(null, pinnedAddress, pinnedFamily);
          }
        },
      },
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remainingMs);

    try {
      const response = await undiciFetch(currentUrl, {
        redirect: "manual",
        signal: controller.signal,
        dispatcher: agent,
        headers: {
          "User-Agent": "SiteCheckAI-Bot/0.1 (+https://sitecheck.ai)",
        },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) {
          return {
            ok: false,
            reason: "network_error",
            message: "Redirect without a Location header",
            status: response.status,
          };
        }
        currentUrl = new URL(location, currentUrl);
        continue;
      }

      if (response.status < 200 || response.status >= 300) {
        return {
          ok: false,
          reason: "non_success_status",
          message: `Unexpected status ${response.status}`,
          status: response.status,
        };
      }

      const { text, truncated } = await readBodyWithLimit(
        response.body as ReadableStream<Uint8Array> | null,
        maxBytes,
      );

      return {
        ok: true,
        status: response.status,
        finalUrl: currentUrl.toString(),
        contentType: response.headers.get("content-type"),
        html: text,
        truncated,
        elapsedMs: Date.now() - startedAt,
      };
    } catch (error) {
      if (controller.signal.aborted) {
        return { ok: false, reason: "timeout", message: "Request timed out" };
      }
      return {
        ok: false,
        reason: "network_error",
        message: error instanceof Error ? error.message : "Fetch failed",
      };
    } finally {
      clearTimeout(timer);
      await agent.close();
    }
  }

  return {
    ok: false,
    reason: "too_many_redirects",
    message: `Exceeded ${maxRedirects} redirects`,
  };
}

async function readBodyWithLimit(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  if (!body) {
    return { text: "", truncated: false };
  }

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  let truncated = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      received += value.byteLength;
      if (received > maxBytes) {
        const allowed = value.byteLength - (received - maxBytes);
        chunks.push(value.subarray(0, Math.max(allowed, 0)));
        truncated = true;
        await reader.cancel();
        break;
      }
      chunks.push(value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // Already released by cancel(); nothing to do.
    }
  }

  const combined = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return { text: combined.toString("utf-8"), truncated };
}
