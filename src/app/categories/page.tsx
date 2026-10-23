import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { MobileCategoriesView } from "@/components/layout/MobileCategoriesView";
import { getCategoryTree } from "@/domains/catalog/queries";
import { toNavTree } from "@/domains/categories/tree";

export const metadata: Metadata = {
  title: "دسته‌بندی‌ها",
  // The mobile "categories" tab. Desktop navigates with the header menu and
  // each category already has its own indexable page, so this is not indexed.
  robots: { index: false, follow: true },
};

export default async function CategoriesPage() {
  const categories = toNavTree(await getCategoryTree());
  return (
    <main className="pb-6">
      <Container>
        <h1 className="sr-only">دسته‌بندی‌ها</h1>
        <MobileCategoriesView categories={categories} />
      </Container>
    </main>
  );
}
