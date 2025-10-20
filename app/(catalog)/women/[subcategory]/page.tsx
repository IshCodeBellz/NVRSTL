import CategoryPage from "../../[category]/page";

// Wrapper: maps /women/<sub> to existing generic category page using the subcategory slug directly.
// We keep subcategory list constrained to those currently supported.

export default function WomenSubcategoryPage({
  params,
}: {
  params: { subcategory: string };
}) {
  // Reuse underlying CategoryPage by passing through the slug (e.g. dresses, outerwear)
  return <CategoryPage params={{ category: params.subcategory }} />;
}
