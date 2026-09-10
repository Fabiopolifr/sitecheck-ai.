import { describe, expect, it } from "vitest";
import {
  composeOutreachEmail,
  signUnsubscribeToken,
} from "@/features/outreach/composeEmail";

describe("composeOutreachEmail", () => {
  it("includes the actual finding, not generic copy", () => {
    const { text, html } = composeOutreachEmail({
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
      businessName: "Test",
      website: "https://example.it",
      toEmail: "info@example.it",
      reason: "x",
    });
    expect(text).toContain("Freesbe");
  });
});
