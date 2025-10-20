import CategoryPage from "../../[category]/page";

export default function MenSubcategoryPage({
  params,
}: {
  params: { subcategory: string };
}) {
  return <CategoryPage params={{ category: params.subcategory }} />;
}
