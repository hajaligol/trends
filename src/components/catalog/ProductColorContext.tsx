"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { CatalogProductVariant } from "@/domains/catalog/queries";

/**
 * Shares the selected colour between the gallery (left column) and the
 * variant selector (right column) of the product page — they are siblings in
 * a Server Component, so the colour lives in a small client provider.
 *
 * Display state only: nothing here is trusted for price or stock; the cart
 * action still receives just a variant id.
 */
type ProductColorState = {
  selectedColor: string;
  setSelectedColor: (color: string) => void;
};

const ProductColorContext = createContext<ProductColorState | null>(null);

/** Starts on a purchasable variant's colour when there is one. */
export function initialColorFor(variants: CatalogProductVariant[]): string {
  const first = variants.find((variant) => variant.stockState !== "out-of-stock") ?? variants[0];
  return first?.color ?? "";
}

export function ProductColorProvider({
  variants,
  children,
}: {
  variants: CatalogProductVariant[];
  children: ReactNode;
}) {
  const [selectedColor, setSelectedColor] = useState(() => initialColorFor(variants));
  return <ProductColorContext.Provider value={{ selectedColor, setSelectedColor }}>{children}</ProductColorContext.Provider>;
}

export function useProductColor(): ProductColorState {
  const context = useContext(ProductColorContext);
  if (!context) throw new Error("useProductColor must be used inside <ProductColorProvider>");
  return context;
}
