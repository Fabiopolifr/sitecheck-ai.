import type { Check, DetectorContext } from "../types";

export function detectSeo(ctx: DetectorContext): Check[] {
  const { $ } = ctx;
  const checks: Check[] = [];

  const title = $("title").first().text().trim();
  const titleLength = title.length;
  checks.push({
    id: "title_length",
    category: "seo",
    status: !title
      ? "fail"
      : titleLength >= 10 && titleLength <= 70
        ? "pass"
        : "warning",
    value: titleLength,
    confidence: 0.8,
    evidence: title || undefined,
    weight: 15,
  });

  const metaDescription = (
    $('meta[name="description"]').attr("content") ?? ""
  ).trim();
  const descLength = metaDescription.length;
  checks.push({
    id: "meta_description_length",
    category: "seo",
    status: !metaDescription
      ? "fail"
      : descLength >= 50 && descLength <= 160
        ? "pass"
        : "warning",
    value: descLength,
    confidence: 0.8,
    weight: 15,
  });

  const h1Count = $("h1").length;
  checks.push({
    id: "h1_presence",
    category: "seo",
    status: h1Count === 1 ? "pass" : h1Count === 0 ? "fail" : "warning",
    value: h1Count,
    confidence: 0.9,
    weight: 15,
  });

  const headingLevelsUsed = new Set<number>();
  $("h1, h2, h3, h4, h5, h6").each((_, el) => {
    headingLevelsUsed.add(Number(el.tagName.slice(1)));
  });
  const sortedLevels = [...headingLevelsUsed].sort((a, b) => a - b);
  let hierarchyOk = true;
  for (let i = 1; i < sortedLevels.length; i++) {
    if (sortedLevels[i] - sortedLevels[i - 1] > 1) {
      hierarchyOk = false;
      break;
    }
  }
  checks.push({
    id: "heading_hierarchy",
    category: "seo",
    status:
      sortedLevels.length === 0 ? "unknown" : hierarchyOk ? "pass" : "warning",
    value: sortedLevels,
    confidence: 0.6,
    weight: 10,
  });

  const images = $("img");
  const imagesWithAlt = images.filter((_, el) =>
    Boolean($(el).attr("alt")?.trim()),
  ).length;
  const altCoverage =
    images.length === 0 ? null : imagesWithAlt / images.length;
  checks.push({
    id: "image_alt_coverage",
    category: "seo",
    status:
      altCoverage === null
        ? "unknown"
        : altCoverage >= 0.8
          ? "pass"
          : altCoverage >= 0.4
            ? "warning"
            : "fail",
    value: altCoverage,
    confidence: altCoverage === null ? 0.3 : 0.8,
    weight: 15,
  });

  const ogTags = ["og:title", "og:description", "og:image"].filter((prop) =>
    Boolean($(`meta[property="${prop}"]`).attr("content")),
  );
  checks.push({
    id: "open_graph",
    category: "seo",
    status:
      ogTags.length === 3 ? "pass" : ogTags.length > 0 ? "warning" : "fail",
    value: ogTags,
    confidence: 0.8,
    weight: 10,
  });

  const robotsMeta = $('meta[name="robots"]').attr("content")?.toLowerCase();
  const indexable = !robotsMeta || !robotsMeta.includes("noindex");
  checks.push({
    id: "indexability",
    category: "seo",
    status: indexable ? "pass" : "fail",
    value: indexable,
    confidence: 0.9,
    evidence: robotsMeta,
    weight: 20,
  });

  return checks;
}
