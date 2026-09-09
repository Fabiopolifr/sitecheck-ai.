import { describe, expect, it } from "vitest";
import {
  assertAllowedProtocol,
  assertSafeHostname,
  isBlockedIpAddress,
  resolveSafeAddresses,
  SsrfBlockedError,
} from "@/lib/security/ssrf";

describe("isBlockedIpAddress", () => {
  it("blocks loopback", () => {
    expect(isBlockedIpAddress("127.0.0.1")).toBe(true);
    expect(isBlockedIpAddress("::1")).toBe(true);
  });

  it("blocks RFC1918 private ranges", () => {
    expect(isBlockedIpAddress("10.0.0.5")).toBe(true);
    expect(isBlockedIpAddress("172.16.0.5")).toBe(true);
    expect(isBlockedIpAddress("192.168.1.1")).toBe(true);
  });

  it("blocks link-local addresses", () => {
    expect(isBlockedIpAddress("169.254.1.1")).toBe(true);
    expect(isBlockedIpAddress("fe80::1")).toBe(true);
  });

  it("blocks the cloud metadata address", () => {
    expect(isBlockedIpAddress("169.254.169.254")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 private addresses", () => {
    expect(isBlockedIpAddress("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows public addresses", () => {
    expect(isBlockedIpAddress("8.8.8.8")).toBe(false);
    expect(isBlockedIpAddress("1.1.1.1")).toBe(false);
  });

  it("treats invalid literals as unsafe", () => {
    expect(isBlockedIpAddress("not-an-ip")).toBe(true);
  });
});

describe("assertSafeHostname", () => {
  it("rejects localhost", () => {
    expect(() => assertSafeHostname("localhost")).toThrow(SsrfBlockedError);
  });

  it("rejects .internal suffixes", () => {
    expect(() => assertSafeHostname("service.internal")).toThrow(
      SsrfBlockedError,
    );
  });

  it("allows ordinary public hostnames", () => {
    expect(() => assertSafeHostname("example.com")).not.toThrow();
  });
});

describe("assertAllowedProtocol", () => {
  it("allows http and https", () => {
    expect(() => assertAllowedProtocol("http:")).not.toThrow();
    expect(() => assertAllowedProtocol("https:")).not.toThrow();
  });

  it("rejects other protocols", () => {
    expect(() => assertAllowedProtocol("file:")).toThrow(SsrfBlockedError);
    expect(() => assertAllowedProtocol("ftp:")).toThrow(SsrfBlockedError);
  });
});

describe("resolveSafeAddresses", () => {
  it("rejects a literal private IP without a DNS lookup", async () => {
    await expect(resolveSafeAddresses("127.0.0.1")).rejects.toThrow(
      SsrfBlockedError,
    );
  });

  it("accepts a literal public IP without a DNS lookup", async () => {
    const addresses = await resolveSafeAddresses("8.8.8.8");
    expect(addresses).toEqual([{ address: "8.8.8.8", family: 4 }]);
  });
});
