import { redirect } from "next/navigation";

export default async function CategoryRedirectPage({
  params,
}: {
  params: { slug: string };
}) {
  // Redirect /category/slug to /slug format for consistency
  redirect(`/${params.slug}`);
}
