import { describe, expect, it } from "vitest";
import { extractCellsFromDelimitedText } from "@/features/outreach/parseCsvUrls";

describe("extractCellsFromDelimitedText", () => {
  it("splits comma-delimited rows into individual cells", () => {
    const text = "Agenzia Rossi,https://agenziarossi.it,Milano";
    expect(extractCellsFromDelimitedText(text)).toEqual([
      "Agenzia Rossi",
      "https://agenziarossi.it",
      "Milano",
    ]);
  });

  it("handles semicolon-delimited rows (common in Italian Excel exports)", () => {
    const text = "Nome;Sito;Città\nRossi Srl;https://rossisrl.it;Roma";
    expect(extractCellsFromDelimitedText(text)).toEqual([
      "Nome",
      "Sito",
      "Città",
      "Rossi Srl",
      "https://rossisrl.it",
      "Roma",
    ]);
  });

  it("strips surrounding quotes from quoted cells", () => {
    const text = '"Rossi Srl","https://rossisrl.it"';
    expect(extractCellsFromDelimitedText(text)).toEqual([
      "Rossi Srl",
      "https://rossisrl.it",
    ]);
  });

  it("skips empty lines and empty cells", () => {
    const text = "a,,b\n\nc";
    expect(extractCellsFromDelimitedText(text)).toEqual(["a", "b", "c"]);
  });
});
