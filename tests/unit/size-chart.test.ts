import { describe, expect, it } from "vitest";
import { sizeChartSchema } from "@/lib/validation/admin";

const parse = (input: { columns: string[]; cells: string[]; note?: string }) =>
  sizeChartSchema.safeParse({ note: "", ...input });

describe("sizeChartSchema", () => {
  it("builds a rectangular table from row-major cells", () => {
    const result = parse({ columns: ["سایز", "دور سینه"], cells: ["S", "96", "M", "100"], note: " cm " });
    expect(result.success && result.data).toEqual({
      columns: ["سایز", "دور سینه"],
      rows: [["S", "96"], ["M", "100"]],
      note: "cm",
    });
  });

  it("drops blank rows and treats a fully empty table as 'remove'", () => {
    const partial = parse({ columns: ["سایز", "قد"], cells: ["S", "70", "", ""] });
    expect(partial.success && partial.data?.rows).toEqual([["S", "70"]]);
    const empty = parse({ columns: [], cells: [] });
    expect(empty.success && empty.data).toBeNull();
  });

  it("rejects duplicate headings, headings with no name, and heading-only tables", () => {
    expect(parse({ columns: ["سایز", "سایز"], cells: ["S", "M"] }).success).toBe(false);
    expect(parse({ columns: ["سایز", ""], cells: ["S", "96"] }).success).toBe(false);
    expect(parse({ columns: ["سایز", "قد"], cells: ["", ""] }).success).toBe(false);
  });

  it("enforces size limits", () => {
    const cols = Array.from({ length: 9 }, (_, i) => `c${i}`);
    expect(parse({ columns: cols, cells: cols.map(() => "1") }).success).toBe(false);
    expect(parse({ columns: ["a"], cells: ["x".repeat(41)] }).success).toBe(false);
    const rows = Array.from({ length: 25 }, (_, i) => String(i + 1));
    expect(parse({ columns: ["a"], cells: rows }).success).toBe(false);
  });
});
