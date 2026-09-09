import type { Check, DetectorContext } from "../types";

export function detectTechnical(ctx: DetectorContext): Check[] {
  const { $, finalUrl, status } = ctx;
  const checks: Check[] = [];

  checks.push({
    id: "https",
    category: "technical",
    status: finalUrl.protocol === "https:" ? "pass" : "warning",
    value: finalUrl.protocol === "https:",
    confidence: 1,
    evidence: finalUrl.protocol,
    weight: 20,
  });

  checks.push({
    id: "status_code",
    category: "technical",
    status: status >= 200 && status < 300 ? "pass" : "warning",
    value: status,
    confidence: 1,
    weight: 15,
  });

  const canonical = $('link[rel="canonical"]').attr("href");
  checks.push({
    id: "canonical",
    category: "technical",
    status: canonical ? "pass" : "warning",
    value: Boolean(canonical),
    confidence: 0.8,
    evidence: canonical,
    weight: 10,
  });

  const viewport = $('meta[name="viewport"]').attr("content");
  checks.push({
    id: "viewport",
    category: "technical",
    status: viewport ? "pass" : "fail",
    value: Boolean(viewport),
    confidence: 0.9,
    evidence: viewport,
    weight: 10,
  });

  const lang = $("html").attr("lang");
  checks.push({
    id: "lang_attribute",
    category: "technical",
    status: lang && lang.trim() ? "pass" : "warning",
    value: lang ?? null,
    confidence: 0.9,
    evidence: lang,
    weight: 10,
  });

  const title = $("title").first().text().trim();
  checks.push({
    id: "title_present",
    category: "technical",
    status: title ? "pass" : "fail",
    value: Boolean(title),
    confidence: 1,
    evidence: title || undefined,
    weight: 10,
  });

  const metaDescription = $('meta[name="description"]').attr("content");
  checks.push({
    id: "meta_description_present",
    category: "technical",
    status: metaDescription && metaDescription.trim() ? "pass" : "fail",
    value: Boolean(metaDescription),
    confidence: 0.9,
    weight: 10,
  });

  const favicon = $(
    'link[rel="icon"], link[rel="shortcut icon"], link[rel~="icon"]',
  ).length;
  checks.push({
    id: "favicon_present",
    category: "technical",
    status: favicon > 0 ? "pass" : "warning",
    value: favicon > 0,
    confidence: 0.7,
    weight: 5,
  });

  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase();
  checks.push({
    id: "robots_meta",
    category: "technical",
    status: !robotsMeta
      ? "pass"
      : robotsMeta.includes("noindex")
        ? "warning"
        : "pass",
    value: robotsMeta ?? null,
    confidence: 0.9,
    evidence: robotsMeta,
    weight: 5,
  });

  const structuredData = $('script[type="application/ld+json"]').length;
  checks.push({
    id: "structured_data_present",
    category: "technical",
    status: structuredData > 0 ? "pass" : "unknown",
    value: structuredData > 0,
    confidence: 0.6,
    weight: 5,
  });

  return checks;
}
