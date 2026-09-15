/**
 * Serializes a value for embedding inside a `<script type="application/
 * ld+json">` tag via `dangerouslySetInnerHTML`.
 *
 * Plain `JSON.stringify()` does not escape `<`, so a string value
 * containing a literal `</script>` sequence would prematurely close the
 * script tag and let whatever follows it in the page be parsed as raw
 * HTML/script — the classic JSON-in-HTML injection gotcha (rule
 * "no `dangerouslySetInnerHTML` casually" applies to *how* it's used,
 * not just whether). The one call site this project has
 * (`/product/[slug]`'s `Product` JSON-LD) only serializes admin/staff-
 * authored catalog fields (title, description), not arbitrary customer
 * input — a real but low-likelihood risk given that trust boundary —
 * but escaping `<` costs nothing and removes the class of bug entirely
 * regardless of what future fields get added to the object.
 */
export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
