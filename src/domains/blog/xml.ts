/** Escapes text for use inside XML element content or attribute values. */
export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Characters XML 1.0 forbids would make the whole feed invalid.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
}
