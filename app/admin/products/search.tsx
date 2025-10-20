import { Suspense } from "react";
import ProductsSearchClient from "./searchClient";

export default function Search() {
  return (
    <Suspense>
      <ProductsSearchClient />
    </Suspense>
  );
}
