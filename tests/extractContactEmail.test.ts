import { describe, expect, it } from "vitest";
import { extractContactEmail } from "@/features/outreach/extractContactEmail";

describe("extractContactEmail", () => {
  it("prefers a mailto: link over bare text", () => {
    const html = `<a href="mailto:info@example.it">Scrivici</a><p>oppure vendite@altro.it</p>`;
    expect(extractContactEmail(html, "example.it")).toBe("info@example.it");
  });

  it("prefers a generic alias (info@) over a personal-looking one", () => {
    const html = `mario.rossi@example.it e info@example.it sono entrambi presenti`;
    expect(extractContactEmail(html, "example.it")).toBe("info@example.it");
  });

  it("prefers an address on the site's own domain over a third-party one", () => {
    const html = `<a href="mailto:noreply@sentry.io">x</a> contatti@example.it`;
    expect(extractContactEmail(html, "example.it")).toBe("contatti@example.it");
  });

  it("filters out obvious junk matches", () => {
    const html = `logo@2x.png noreply@example.it test@example.com`;
    expect(extractContactEmail(html, "example.it")).toBeNull();
  });

  it("returns null when no email is found", () => {
    expect(
      extractContactEmail("<p>Nessun contatto qui</p>", "example.it"),
    ).toBeNull();
  });
});
