/**
 * Extracts every URL-looking cell from a CSV/TSV file's raw text.
 * Deliberately column-agnostic: business exports vary (name, website,
 * city, phone in any order/language), so instead of guessing a "website"
 * column by header name, every cell is offered to the caller's URL
 * validator (normalizeUrl) and only the ones that parse as a URL survive
 * — a name or a phone number never does. Handles comma, semicolon, and
 * tab as delimiters since exports vary by locale (Italian Excel often
 * uses ";").
 */
export function extractCellsFromDelimitedText(text: string): string[] {
  const cells: string[] = [];

  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    for (const rawCell of line.split(/[,;\t]/)) {
      const cell = rawCell.trim().replace(/^"|"$/g, "").trim();
      if (cell) cells.push(cell);
    }
  }

  return cells;
}
