import { describe, expect, it } from "vitest";
import { pickImageForColor, resolveRequestedColor, selectGalleryImages, type ColoredImage } from "@/domains/catalog/gallery";

const img = (url: string, color: string | null): ColoredImage => ({ url, altText: url, color });

const images = [
  img("black-1", "مشکی"),
  img("shared-1", null),
  img("blue-1", "آبی"),
  img("black-2", "مشکی"),
  img("blue-2", "آبی"),
];

describe("selectGalleryImages", () => {
  it("shows only the selected colour's images, in display order", () => {
    expect(selectGalleryImages(images, "مشکی").map((i) => i.url)).toEqual(["black-1", "black-2"]);
    expect(selectGalleryImages(images, "آبی").map((i) => i.url)).toEqual(["blue-1", "blue-2"]);
  });

  it("never mixes in another colour's or shared images when the colour has its own", () => {
    const urls = selectGalleryImages(images, "مشکی").map((i) => i.url);
    expect(urls).not.toContain("blue-1");
    expect(urls).not.toContain("shared-1");
  });

  it("falls back to shared images for a colour with no photos of its own", () => {
    expect(selectGalleryImages(images, "قرمز").map((i) => i.url)).toEqual(["shared-1"]);
  });

  it("returns nothing (placeholder) when the colour has none and there are no shared images", () => {
    expect(selectGalleryImages([img("blue-1", "آبی")], "مشکی")).toEqual([]);
  });

  it("treats a product with only shared images as before (same set for every colour)", () => {
    const shared = [img("a", null), img("b", null)];
    expect(selectGalleryImages(shared, "مشکی")).toHaveLength(2);
    expect(selectGalleryImages(shared, "آبی")).toHaveLength(2);
  });

  it("with no colour selected, shows only shared images", () => {
    expect(selectGalleryImages(images, null).map((i) => i.url)).toEqual(["shared-1"]);
  });
});

describe("pickImageForColor", () => {
  it("picks the first image of the line's colour", () => {
    expect(pickImageForColor(images, "آبی")?.url).toBe("blue-1");
  });
  it("falls back to the first shared image, then null", () => {
    expect(pickImageForColor(images, "قرمز")?.url).toBe("shared-1");
    expect(pickImageForColor([img("blue-1", "آبی")], "مشکی")).toBeNull();
  });
});

describe("resolveRequestedColor", () => {
  const colors = ["مشکی", "آبی"];
  it("accepts a colour the product has", () => {
    expect(resolveRequestedColor(colors, "آبی")).toBe("آبی");
  });
  it("uses the first value when the param is repeated", () => {
    expect(resolveRequestedColor(colors, ["مشکی", "آبی"])).toBe("مشکی");
  });
  it("ignores missing, empty, unknown or tampered values", () => {
    expect(resolveRequestedColor(colors, undefined)).toBeNull();
    expect(resolveRequestedColor(colors, "")).toBeNull();
    expect(resolveRequestedColor(colors, "قرمز")).toBeNull();
    expect(resolveRequestedColor(colors, "<script>")).toBeNull();
  });
});
