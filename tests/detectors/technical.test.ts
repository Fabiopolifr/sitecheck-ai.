import { describe, expect, it } from "vitest";
import * as cheerio from "cheerio";
import { detectTechnical } from "@/features/audit/detectors/technical";
import type { DetectorContext } from "@/features/audit/types";

function buildContext(
  html: string,
  overrides: Partial<DetectorContext> = {},
): DetectorContext {
  return {
    html,
    $: cheerio.load(html),
    finalUrl: new URL("https://example.com/"),
    status: 200,
    contentType: "text/html",
    elapsedMs: 100,
    pageSpeed: null,
    ...overrides,
  };
}

describe("detectTechnical", () => {
  it("flags a well-formed page as passing", () => {
    const html = `<html lang="it"><head>
      <title>Agenzia Immobiliare Rossi</title>
      <meta name="description" content="Trova la casa dei tuoi sogni con noi.">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <link rel="canonical" href="https://example.com/">
      <link rel="icon" href="/favicon.ico">
    </head><body></body></html>`;

    const checks = detectTechnical(buildContext(html));
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));

    expect(byId.https.status).toBe("pass");
    expect(byId.viewport.status).toBe("pass");
    expect(byId.title_present.status).toBe("pass");
    expect(byId.meta_description_present.status).toBe("pass");
    expect(byId.canonical.status).toBe("pass");
    expect(byId.lang_attribute.status).toBe("pass");
  });

  it("flags a bare-bones page as needing attention", () => {
    const html = `<html><head></head><body></body></html>`;
    const checks = detectTechnical(buildContext(html));
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));

    expect(byId.title_present.status).toBe("fail");
    expect(byId.viewport.status).toBe("fail");
    expect(byId.lang_attribute.status).toBe("warning");
  });

  it("flags http as a warning, not a failure", () => {
    const html = `<html><head><title>Test</title></head><body></body></html>`;
    const checks = detectTechnical(
      buildContext(html, { finalUrl: new URL("http://example.com/") }),
    );
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
    expect(byId.https.status).toBe("warning");
  });

  it("flags noindex robots meta as a warning", () => {
    const html = `<html><head><meta name="robots" content="noindex, nofollow"></head></html>`;
    const checks = detectTechnical(buildContext(html));
    const byId = Object.fromEntries(checks.map((c) => [c.id, c]));
    expect(byId.robots_meta.status).toBe("warning");
  });
});
