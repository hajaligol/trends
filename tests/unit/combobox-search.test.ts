import { createElement as h, Fragment } from "react";
import { describe, expect, it } from "vitest";
import { filterOptions, normalizeForSearch, optionsFromChildren } from "@/components/admin/ui/combobox";

describe("combobox helpers", () => {
  it("reads <option>/<optgroup> children, fragments and mapped arrays", () => {
    const options = optionsFromChildren([
      h("option", { key: "a", value: "" }, "همه"),
      h(Fragment, { key: "f" }, h("option", { value: "1" }, "نایک", " (غیرفعال)")),
      h("optgroup", { key: "g", label: "زنانه" }, h("option", { value: "2", disabled: true }, "هودی")),
    ]);
    expect(options).toEqual([
      { value: "", label: "همه", disabled: undefined, group: undefined },
      { value: "1", label: "نایک (غیرفعال)", disabled: undefined, group: undefined },
      { value: "2", label: "هودی", disabled: true, group: "زنانه" },
    ]);
  });

  it("normalises Persian/Arabic digits, ي/ك, ZWNJ and case", () => {
    expect(normalizeForSearch("  ك۱٢ Nike  ")).toBe("ک12 nike");
    expect(normalizeForSearch("می‌خواهم")).toBe(normalizeForSearch("میخواهم"));
  });

  it("matches every token, in label, group or hidden search text", () => {
    const options = [
      { value: "a", label: "پیراهن کلاسیک", group: "مردانه" },
      { value: "b", label: "هودی روزانه", group: "زنانه", searchText: "hoodie" },
    ];
    expect(filterOptions(options, "")).toHaveLength(2);
    expect(filterOptions(options, "پیرهن")).toHaveLength(0);
    expect(filterOptions(options, "پیراهن مردانه").map((o) => o.value)).toEqual(["a"]);
    expect(filterOptions(options, "HOODIE").map((o) => o.value)).toEqual(["b"]);
  });
});
