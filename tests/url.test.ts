import { describe, expect, it } from "vitest";
import { normalizeUrl } from "@/features/audit/url";

describe("normalizeUrl", () => {
  it("defaults to https when no scheme is given", () => {
    const result = normalizeUrl("example.com");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url.toString()).toBe("https://example.com/");
  });

  it("accepts www subdomains", () => {
    const result = normalizeUrl("www.example.com");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url.hostname).toBe("www.example.com");
  });

  it("preserves an explicit http scheme", () => {
    const result = normalizeUrl("http://example.com");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url.protocol).toBe("http:");
  });

  it("lowercases the hostname", () => {
    const result = normalizeUrl("https://EXAMPLE.com");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.url.hostname).toBe("example.com");
  });

  it("rejects empty input", () => {
    expect(normalizeUrl("   ").ok).toBe(false);
  });

  it("rejects unsupported protocols", () => {
    expect(normalizeUrl("ftp://example.com").ok).toBe(false);
  });

  it("rejects unparsable input", () => {
    expect(normalizeUrl("https://").ok).toBe(false);
  });
});
