import { describe, expect, it } from "vitest";
import { CATEGORY_TAXONOMY } from "@/domains/categories/taxonomy";
import { buildSeedSizeChart, parseTypeSlug } from "@/lib/db/seed-size-chart-data";
import { sizeChartSchema } from "@/lib/validation/admin";

const SIZES = {
  adultClothing: ["S", "M", "L", "XL"],
  kidsClothing: ["۴ سال", "۶ سال", "۸ سال"],
  menShoes: ["40", "41", "42", "43", "44", "45"],
  womenShoes: ["36", "37", "38", "39", "40", "41"],
  kidsShoes: ["28", "30", "32", "34"],
  free: ["فری‌سایز"],
};

function sizesFor(audience: string, group: string): string[] {
  if (group === "shoes") return audience === "kids" ? SIZES.kidsShoes : audience === "women" ? SIZES.womenShoes : SIZES.menShoes;
  if (group === "clothing") return audience === "kids" ? SIZES.kidsClothing : SIZES.adultClothing;
  return SIZES.free;
}

describe("seed size charts", () => {
  const types = CATEGORY_TAXONOMY.filter((node) => node.depth === 3);

  it("covers the whole taxonomy and passes the same validation as the admin form", () => {
    expect(types.length).toBeGreaterThan(100);
    for (const node of types) {
      const parsed = parseTypeSlug(node.slug);
      expect(parsed, node.slug).not.toBeNull();
      const sizes = sizesFor(parsed!.audience, parsed!.group);
      const chart = buildSeedSizeChart({ ...parsed!, sizes });

      expect(chart.rows.map((row) => row[0]), node.slug).toEqual(sizes);
      for (const row of chart.rows) expect(row, node.slug).toHaveLength(chart.columns.length);

      const result = sizeChartSchema.safeParse({ columns: chart.columns, cells: chart.rows.flat(), note: chart.note ?? "" });
      expect(result.success, `${node.slug}: ${result.success ? "" : result.error.issues[0]?.message}`).toBe(true);
      expect(result.success && result.data).toEqual(chart);
    }
  });

  it("derives shoe foot length from the EU size", () => {
    const chart = buildSeedSizeChart({ audience: "men", group: "shoes", typeKey: "sneakers", sizes: ["42", "36"] });
    expect(chart.rows).toEqual([["42", "26٫5"], ["36", "22٫5"]]);
  });

  it("falls back to a free-size table for unknown types and empty sizes", () => {
    const chart = buildSeedSizeChart({ audience: "men", group: "accessories", typeKey: "something-new", sizes: [] });
    expect(chart.rows).toHaveLength(1);
    expect(chart.rows[0]![0]).toBe("فری‌سایز");
  });
});
