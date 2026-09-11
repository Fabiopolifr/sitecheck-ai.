import { describe, expect, it } from "vitest";
import {
  composeOutreachEmail,
  composeOutreachFollowUpEmail,
  signUnsubscribeToken,
} from "@/features/outreach/composeEmail";

describe("composeOutreachEmail", () => {
  it("includes the actual finding, not generic copy", () => {
    const { text, html } = composeOutreachEmail({
      siteId: "site-1",
      businessName: "Agenzia Rossi",
      website: "https://agenziarossi.it",
      toEmail: "info@agenziarossi.it",
      reason: "Cookie & Consent: Nessuna piattaforma di consenso rilevata",
    });
    expect(text).toContain("Nessuna piattaforma di consenso rilevata");
    expect(html).toContain("Nessuna piattaforma di consenso rilevata");
  });

  it("always includes a working unsubscribe link with a valid token", () => {
    const { text } = composeOutreachEmail({
      siteId: "site-2",
      businessName: null,
      website: "https://example.it",
      toEmail: "info@example.it",
      reason: "Privacy: Informativa privacy non rilevata",
    });
    const expectedToken = signUnsubscribeToken("info@example.it");
    expect(text).toContain("/unsubscribe?");
    expect(text).toContain(expectedToken);
  });

  it("identifies the sender", () => {
    const { text } = composeOutreachEmail({
      siteId: "site-3",
      businessName: "Test",
      website: "https://example.it",
      toEmail: "info@example.it",
      reason: "x",
    });
    expect(text).toContain("Freesbe");
  });

  it("includes a report link built from the site id", () => {
    const { text, html } = composeOutreachEmail({
      siteId: "site-4",
      businessName: "Test",
      website: "https://example.it",
      toEmail: "info@example.it",
      reason: "x",
    });
    expect(text).toContain("/api/outreach/click/site-4");
    expect(html).toContain("/api/outreach/click/site-4");
  });

  it("deterministically assigns the same subject variant for the same site id", () => {
    const first = composeOutreachEmail({
      siteId: "stable-id",
      businessName: "Test",
      website: "https://example.it",
      toEmail: "info@example.it",
      reason: "x",
    });
    const second = composeOutreachEmail({
      siteId: "stable-id",
      businessName: "Test",
      website: "https://example.it",
      toEmail: "info@example.it",
      reason: "x",
    });
    expect(first.variant).toBe(second.variant);
    expect(first.subject).toBe(second.subject);
  });

  it("spreads sites across more than one subject variant", () => {
    const variants = new Set(
      Array.from(
        { length: 20 },
        (_, i) =>
          composeOutreachEmail({
            siteId: `site-${i}`,
            businessName: "Test",
            website: "https://example.it",
            toEmail: "info@example.it",
            reason: "x",
          }).variant,
      ),
    );
    expect(variants.size).toBeGreaterThan(1);
  });
});

describe("composeOutreachFollowUpEmail", () => {
  it("frames itself explicitly as a follow-up, not a new contact", () => {
    const { text } = composeOutreachFollowUpEmail({
      siteId: "site-5",
      businessName: "Agenzia Rossi",
      website: "https://agenziarossi.it",
      toEmail: "info@agenziarossi.it",
      reason: "Cookie & Consent: Nessuna piattaforma di consenso rilevata",
    });
    expect(text.toLowerCase()).toContain("di nuovo");
  });

  it("uses a different variant id namespace than the first-contact email", () => {
    const { variant } = composeOutreachFollowUpEmail({
      siteId: "site-6",
      businessName: "Test",
      website: "https://example.it",
      toEmail: "info@example.it",
      reason: "x",
    });
    expect(["F1", "F2"]).toContain(variant);
  });
});
