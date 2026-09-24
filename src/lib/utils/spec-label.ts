/** Normalizes a specification-table label for duplicate/override comparison
 * only (never for storage): collapses whitespace, unifies Arabic/Persian
 * ی and ک, and lowercases Latin text. */
export function normalizeSpecLabel(label: string): string {
  return label.replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ").trim().toLowerCase();
}
